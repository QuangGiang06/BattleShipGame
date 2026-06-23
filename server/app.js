import express from 'express';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { Server } from 'socket.io';
import helmet from 'helmet';

import { fireAtCell } from '../src/game/attack.js';
import { areAllPlayersReady, createGameState, resetMatchState } from '../src/game/gameState.js';
import { placeShips, validateFleetPlacements } from '../src/game/placement.js';
import { finishGame, startBattle } from '../src/game/turn.js';
import { getPlayerGameView } from '../src/game/visibility.js';
import { normalizeShipPlacements } from './placementPayload.js';

const MAX_PLAYERS = 2;
const ROOM_CODE_LENGTH = 5;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYER_NAME_LENGTH = 24;
const MAX_SOCKET_PAYLOAD_BYTES = 24 * 1024;

export const ROOM_PHASE = Object.freeze({
  WAITING: 'waiting',
  READY: 'ready',
  PLACEMENT: 'placement',
  PLAYING: 'playing',
  ENDED: 'ended',
});

function nowIso() {
  return new Date().toISOString();
}

function numberOption(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readName(payload, fallback) {
  const value = payload?.playerName ?? payload?.name ?? payload?.nickname;

  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  return value.trim().slice(0, MAX_PLAYER_NAME_LENGTH);
}

function readRoomCode(payload) {
  const value = payload?.roomCode ?? payload?.roomId ?? payload?.code;
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function createRoomCode(rooms) {
  for (;;) {
    const code = Array.from(
      { length: ROOM_CODE_LENGTH },
      () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
    ).join('');

    if (!rooms.has(code)) {
      return code;
    }
  }
}

function normalizeOrigins(value, isProduction) {
  if (!value) {
    return isProduction
      ? []
      : ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }

  return String(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function createPlayer(socket, playerId, name) {
  return {
    id: playerId,
    socketId: socket.id,
    name,
    ready: false,
    connected: true,
    disconnectedAt: null,
  };
}

function isJoinable(room) {
  return room.players.length < MAX_PLAYERS
    && [ROOM_PHASE.WAITING, ROOM_PHASE.READY].includes(room.phase);
}

function serializeRoom(room) {
  const readyStatus = Object.fromEntries(room.players.map((player) => [player.id, player.ready]));

  return {
    roomCode: room.code,
    phase: room.phase,
    playerCount: room.players.length,
    maxPlayers: MAX_PLAYERS,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      ready: player.ready,
      connected: player.connected,
      disconnectedAt: player.disconnectedAt,
    })),
    readyStatus,
    game: room.gameState
      ? {
          phase: room.gameState.turn.phase,
          currentPlayerId: room.gameState.turn.currentPlayerId,
          winnerId: room.gameState.turn.winnerId,
          turnNumber: room.gameState.turn.turnNumber,
        }
      : null,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

function createPublicState(room, extra = {}) {
  return {
    roomCode: room.code,
    room: serializeRoom(room),
    ...extra,
  };
}

function createShotPayload(room, shot) {
  const frontendResult = shot.result === 'sunk' ? 'hit' : shot.result;

  return {
    roomCode: room.code,
    attackerId: shot.attackerId,
    defenderId: shot.defenderId,
    index: shot.index,
    row: shot.row,
    col: shot.col,
    result: frontendResult,
    shotResult: shot.result,
    rawResult: shot.result,
    hit: shot.result === 'hit' || shot.result === 'sunk',
    sunk: shot.result === 'sunk',
    sunkShipId: shot.sunkShipId,
    shipId: shot.shipId,
    turnNumber: shot.turnNumber,
    nextTurn: room.gameState.turn.currentPlayerId,
    winnerId: room.gameState.turn.winnerId,
  };
}

function normalizeTarget(payload) {
  if (Number.isInteger(payload)) {
    return payload;
  }

  if (payload?.target) {
    return payload.target;
  }

  if (Number.isInteger(payload?.index)) {
    return { index: payload.index };
  }

  return {
    row: Number(payload?.row),
    col: Number(payload?.col),
  };
}

function isPayloadSafe(payload) {
  try {
    return Buffer.byteLength(JSON.stringify(payload ?? {}), 'utf8') <= MAX_SOCKET_PAYLOAD_BYTES;
  } catch {
    return false;
  }
}

function createLogger(customLogger) {
  if (customLogger) {
    return customLogger;
  }

  return {
    info(event, details = {}) {
      console.log(JSON.stringify({ level: 'info', time: nowIso(), event, ...details }));
    },
    error(event, details = {}) {
      console.error(JSON.stringify({ level: 'error', time: nowIso(), event, ...details }));
    },
  };
}

export function createBattleshipServer(options = {}) {
  const app = express();
  const httpServer = createServer(app);
  const isProduction = (options.nodeEnv ?? process.env.NODE_ENV) === 'production';
  const port = Number(options.port ?? process.env.PORT ?? 3000);
  const reconnectGraceMs = numberOption(
    options.reconnectGraceMs ?? process.env.RECONNECT_GRACE_MS,
    30_000,
  );
  const roomIdleTtlMs = numberOption(
    options.roomIdleTtlMs ?? process.env.ROOM_IDLE_TTL_MS,
    60 * 60 * 1000,
  );
  const rateLimitWindowMs = numberOption(
    options.rateLimitWindowMs ?? process.env.RATE_LIMIT_WINDOW_MS,
    10_000,
  );
  const rateLimitMaxEvents = numberOption(
    options.rateLimitMaxEvents ?? process.env.RATE_LIMIT_MAX_EVENTS,
    80,
  );
  const allowedOrigins = normalizeOrigins(
    options.corsOrigin ?? process.env.CORS_ORIGIN,
    isProduction,
  );
  const exposeRooms = options.exposeRooms
    ?? String(process.env.EXPOSE_ROOMS ?? 'false').toLowerCase() === 'true';
  const distPath = options.distPath ?? path.resolve(process.cwd(), 'dist');
  const logger = createLogger(options.logger);
  const rooms = new Map();
  const playerRooms = new Map();
  const socketPlayers = new Map();
  const disconnectTimers = new Map();
  const rateLimits = new Map();

  function isOriginAllowed(origin) {
    return !origin
      || allowedOrigins.includes('*')
      || allowedOrigins.includes(origin);
  }

  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", 'ws:', 'wss:'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            imgSrc: ["'self'", 'data:'],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          },
        }
      : false,
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(isOriginAllowed(origin) ? 204 : 403);
      return;
    }

    next();
  });

  app.get('/api', (_req, res) => {
    res.json({
      name: 'Battleship Online Server',
      version: '1.0.0',
      ok: true,
      socketPath: '/socket.io',
    });
  });

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      uptimeSeconds: Math.round(process.uptime()),
      rooms: rooms.size,
      connectedPlayers: Array.from(socketPlayers.values()).length,
    });
  });

  app.get('/rooms', (_req, res) => {
    if (!exposeRooms) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }

    res.json({ rooms: Array.from(rooms.values()).map(serializeRoom) });
  });

  const io = new Server(httpServer, {
    maxHttpBufferSize: MAX_SOCKET_PAYLOAD_BYTES,
    cors: {
      origin(origin, callback) {
        callback(isOriginAllowed(origin) ? null : new Error('ORIGIN_NOT_ALLOWED'), isOriginAllowed(origin));
      },
      methods: ['GET', 'POST'],
    },
  });

  function emitRoomState(room, extra = {}) {
    const state = createPublicState(room, extra);
    io.to(room.code).emit('room_state_updated', state);
    io.to(room.code).emit('room_update', state);
  }

  function emitGameViewToPlayer(room, player) {
    if (!room.gameState?.players[player.id] || !player.connected || !player.socketId) {
      return;
    }

    io.to(player.socketId).emit('game_state_updated', {
      roomCode: room.code,
      gameView: getPlayerGameView(room.gameState, player.id),
    });
  }

  function emitGameViews(room) {
    room.players.forEach((player) => emitGameViewToPlayer(room, player));
  }

  function emitActionError(socket, event, error, details = {}) {
    const payload = { event, error, ...details };
    socket.emit('action_error', payload);
    socket.emit('room_error', payload);
  }

  function getPlayerId(socket) {
    return socketPlayers.get(socket.id) ?? socket.data.playerId ?? null;
  }

  function getRoomForPlayer(playerId) {
    const roomCode = playerRooms.get(playerId);
    return roomCode ? rooms.get(roomCode) ?? null : null;
  }

  function getRoomPlayer(room, playerId) {
    return room.players.find((player) => player.id === playerId) ?? null;
  }

  function createRoomForSocket(socket, payload = {}) {
    const playerId = getPlayerId(socket);
    leaveCurrentRoom(playerId, { silent: true, reason: 'switched_room' });

    const code = createRoomCode(rooms);
    const room = {
      code,
      phase: ROOM_PHASE.WAITING,
      players: [createPlayer(socket, playerId, readName(payload, 'Player 1'))],
      gameState: null,
      pendingPlacements: new Map(),
      rematchVotes: new Set(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    rooms.set(code, room);
    playerRooms.set(playerId, code);
    socket.join(code);
    logger.info('room_created', { roomCode: code, playerId });
    return room;
  }

  function joinRoom(socket, room, payload = {}) {
    const playerId = getPlayerId(socket);
    const existingPlayer = getRoomPlayer(room, playerId);

    if (existingPlayer) {
      existingPlayer.connected = true;
      existingPlayer.socketId = socket.id;
      existingPlayer.disconnectedAt = null;
      playerRooms.set(playerId, room.code);
      socket.join(room.code);
      room.updatedAt = nowIso();
      return room;
    }

    if (!isJoinable(room)) {
      throw new Error(room.players.length >= MAX_PLAYERS ? 'ROOM_FULL' : 'ROOM_NOT_JOINABLE');
    }

    leaveCurrentRoom(playerId, { silent: true, reason: 'switched_room' });
    room.players.push(createPlayer(
      socket,
      playerId,
      readName(payload, `Player ${room.players.length + 1}`),
    ));
    room.phase = room.players.length === MAX_PLAYERS ? ROOM_PHASE.READY : ROOM_PHASE.WAITING;
    room.updatedAt = nowIso();
    playerRooms.set(playerId, room.code);
    socket.join(room.code);
    logger.info('room_joined', { roomCode: room.code, playerId });

    if (room.pendingPlacements.size > 0 && room.players.length === MAX_PLAYERS) {
      startPlacement(room);
      applyPendingPlacements(room);
    }

    return room;
  }

  function ensureAutoRoom(socket, payload = {}) {
    const playerId = getPlayerId(socket);
    const currentRoom = getRoomForPlayer(playerId);

    if (currentRoom) {
      return currentRoom;
    }

    const room = Array.from(rooms.values()).find(isJoinable);
    return room ? joinRoom(socket, room, payload) : createRoomForSocket(socket, payload);
  }

  function startPlacement(room) {
    if (room.players.length < MAX_PLAYERS) {
      return false;
    }

    const phaseChanged = room.phase !== ROOM_PHASE.PLACEMENT;

    if (!room.gameState) {
      room.gameState = createGameState(room.players.map((player) => player.id));
    }

    room.phase = ROOM_PHASE.PLACEMENT;
    room.updatedAt = nowIso();

    if (phaseChanged) {
      io.to(room.code).emit('placement_started', createPublicState(room));
    }

    return true;
  }

  function applyPlayerShips(room, playerId, payload) {
    if (!room.gameState?.players[playerId]) {
      return { ok: false, error: 'PLAYER_NOT_IN_GAME' };
    }

    if (room.gameState.players[playerId].ready) {
      return { ok: true, alreadySubmitted: true, placements: [] };
    }

    try {
      const placements = normalizeShipPlacements(payload, {
        fleet: room.gameState.shipSet,
        boardSize: room.gameState.boardSize,
      });
      const fleetValidation = validateFleetPlacements(placements, room.gameState.shipSet);

      if (!fleetValidation.valid) {
        return { ok: false, error: fleetValidation.reason };
      }

      const result = placeShips(room.gameState.players[playerId], placements);

      if (!result.ok) {
        return { ok: false, error: result.error };
      }

      room.gameState = {
        ...room.gameState,
        players: {
          ...room.gameState.players,
          [playerId]: result.playerState,
        },
      };
      room.updatedAt = nowIso();
      return { ok: true, placements };
    } catch (error) {
      return { ok: false, error: error.message || 'SHIP_PAYLOAD_INVALID' };
    }
  }

  function applyPendingPlacements(room) {
    for (const [playerId, payload] of room.pendingPlacements.entries()) {
      const result = applyPlayerShips(room, playerId, payload);
      const player = getRoomPlayer(room, playerId);

      if (result.ok) {
        room.pendingPlacements.delete(playerId);
        if (player?.socketId) {
          io.to(player.socketId).emit('placement_submitted', {
            roomCode: room.code,
            playerId,
            placements: result.placements,
            room: serializeRoom(room),
          });
        }
      } else if (player?.socketId) {
        io.to(player.socketId).emit('action_error', {
          event: 'submit_ships',
          error: result.error,
        });
      }
    }
  }

  function selectFirstPlayer(room) {
    if (options.selectFirstPlayer) {
      return options.selectFirstPlayer(room.gameState.playerOrder, room);
    }

    return room.gameState.playerOrder[randomInt(room.gameState.playerOrder.length)];
  }

  function startMatchIfReady(room) {
    if (!room.gameState || !areAllPlayersReady(room.gameState)) {
      return false;
    }

    if (room.phase === ROOM_PHASE.PLAYING) {
      return true;
    }

    const firstPlayerId = selectFirstPlayer(room);
    room.gameState = startBattle(room.gameState, firstPlayerId);
    room.phase = ROOM_PHASE.PLAYING;
    room.rematchVotes.clear();
    room.updatedAt = nowIso();

    for (const player of room.players) {
      if (!player.connected || !player.socketId) {
        continue;
      }

      io.to(player.socketId).emit('match_started', {
        roomCode: room.code,
        firstTurn: firstPlayerId,
        currentPlayerId: firstPlayerId,
        opponentId: room.players.find((candidate) => candidate.id !== player.id)?.id ?? null,
        room: serializeRoom(room),
        gameView: getPlayerGameView(room.gameState, player.id),
      });
    }

    io.to(room.code).emit('turn_changed', firstPlayerId);
    io.to(room.code).emit('turn_updated', {
      roomCode: room.code,
      currentPlayerId: firstPlayerId,
      turnNumber: room.gameState.turn.turnNumber,
    });
    emitRoomState(room);
    logger.info('match_started', { roomCode: room.code, firstPlayerId });
    return true;
  }

  function endMatch(room, winnerId, reason) {
    if (!room.gameState?.players[winnerId]) {
      return false;
    }

    if (room.gameState.turn.winnerId !== winnerId) {
      room.gameState = finishGame(room.gameState, winnerId);
    }

    room.phase = ROOM_PHASE.ENDED;
    room.updatedAt = nowIso();
    const winner = getRoomPlayer(room, winnerId);
    const loser = room.players.find((player) => player.id !== winnerId) ?? null;
    const payload = {
      roomCode: room.code,
      winnerId,
      winnerName: winner?.name ?? 'Unknown',
      loserId: loser?.id ?? null,
      loserName: loser?.name ?? null,
      reason,
      room: serializeRoom(room),
    };

    io.to(room.code).emit('match_ended', payload);
    io.to(room.code).emit('game_over', payload);
    emitGameViews(room);
    emitRoomState(room);
    logger.info('match_ended', { roomCode: room.code, winnerId, reason });
    return true;
  }

  function removePlayerFromRoom(playerId, reason, silent = false) {
    const room = getRoomForPlayer(playerId);

    if (!room) {
      return;
    }

    const departingPlayer = getRoomPlayer(room, playerId);
    const opponent = room.players.find((player) => player.id !== playerId) ?? null;
    const wasActiveMatch = room.phase === ROOM_PHASE.PLAYING;

    room.pendingPlacements.delete(playerId);
    room.rematchVotes.delete(playerId);
    playerRooms.delete(playerId);
    room.players = room.players.filter((player) => player.id !== playerId);

    if (wasActiveMatch && opponent && room.gameState?.players[opponent.id]) {
      endMatch(room, opponent.id, reason === 'disconnect_timeout' ? 'disconnect' : 'opponent_left');
    } else if (room.phase === ROOM_PHASE.PLACEMENT) {
      room.gameState = null;
      room.phase = ROOM_PHASE.WAITING;
      room.players.forEach((player) => {
        player.ready = false;
      });
    } else if (room.players.length > 0 && room.phase !== ROOM_PHASE.ENDED) {
      room.phase = ROOM_PHASE.WAITING;
    }

    if (room.players.length === 0) {
      rooms.delete(room.code);
      logger.info('room_deleted', { roomCode: room.code });
      return;
    }

    room.updatedAt = nowIso();

    if (!silent) {
      io.to(room.code).emit('opponent_left', {
        roomCode: room.code,
        playerId,
        playerName: departingPlayer?.name ?? null,
        reason,
        room: serializeRoom(room),
      });
      emitRoomState(room);
    }
  }

  function leaveCurrentRoom(playerId, options = {}) {
    const timer = disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(playerId);
    }

    removePlayerFromRoom(playerId, options.reason ?? 'left_room', options.silent ?? false);
  }

  function handleCreateRoom(socket, payload = {}) {
    const room = createRoomForSocket(socket, payload);
    const playerId = getPlayerId(socket);
    socket.emit('room_created', createPublicState(room, { playerId }));
    socket.emit('room_joined', createPublicState(room, { playerId }));
    emitRoomState(room);
  }

  function handleJoinRoom(socket, payload = {}) {
    const roomCode = readRoomCode(payload);

    if (!roomCode || roomCode.length !== ROOM_CODE_LENGTH) {
      emitActionError(socket, 'join_room', 'ROOM_CODE_INVALID', { roomCode });
      return;
    }

    const room = rooms.get(roomCode);

    if (!room) {
      emitActionError(socket, 'join_room', 'ROOM_NOT_FOUND', { roomCode });
      return;
    }

    try {
      joinRoom(socket, room, payload);
      socket.emit('room_joined', createPublicState(room, { playerId: getPlayerId(socket) }));
      emitRoomState(room);
    } catch (error) {
      emitActionError(socket, 'join_room', error.message, { roomCode });
    }
  }

  function handlePlayerReady(socket, payload = {}) {
    const playerId = getPlayerId(socket);
    const room = getRoomForPlayer(playerId) ?? ensureAutoRoom(socket, payload);
    const player = getRoomPlayer(room, playerId);

    if (!player) {
      emitActionError(socket, 'player_ready', 'PLAYER_NOT_IN_ROOM');
      return;
    }

    if (![ROOM_PHASE.WAITING, ROOM_PHASE.READY].includes(room.phase)) {
      emitActionError(socket, 'player_ready', 'ROOM_NOT_WAITING', { room: serializeRoom(room) });
      return;
    }

    player.ready = Boolean(payload.ready ?? true);
    room.phase = room.players.length === MAX_PLAYERS ? ROOM_PHASE.READY : ROOM_PHASE.WAITING;
    room.updatedAt = nowIso();

    if (
      room.players.length === MAX_PLAYERS
      && room.players.every((candidate) => candidate.ready && candidate.connected)
    ) {
      startPlacement(room);
    }

    emitRoomState(room);
  }

  function handleSubmitShips(socket, payload = {}) {
    const playerId = getPlayerId(socket);
    const room = getRoomForPlayer(playerId) ?? ensureAutoRoom(socket, payload);
    room.pendingPlacements.set(playerId, payload);

    if (room.players.length < MAX_PLAYERS) {
      room.phase = ROOM_PHASE.WAITING;
      room.updatedAt = nowIso();
      socket.emit('waiting_for_opponent', createPublicState(room, { playerId }));
      emitRoomState(room);
      return;
    }

    if (![ROOM_PHASE.PLACEMENT, ROOM_PHASE.READY, ROOM_PHASE.WAITING].includes(room.phase)) {
      emitActionError(socket, 'submit_ships', 'PLACEMENT_NOT_ALLOWED');
      return;
    }

    startPlacement(room);
    applyPendingPlacements(room);

    if (!startMatchIfReady(room)) {
      emitRoomState(room);
      emitGameViews(room);
    }
  }

  function handleFireCell(socket, payload = {}) {
    const playerId = getPlayerId(socket);
    const room = getRoomForPlayer(playerId);

    if (!room) {
      emitActionError(socket, 'fire_cell', 'PLAYER_NOT_IN_ROOM');
      return;
    }

    if (room.phase !== ROOM_PHASE.PLAYING) {
      emitActionError(socket, 'fire_cell', 'MATCH_NOT_STARTED', { room: serializeRoom(room) });
      return;
    }

    const result = fireAtCell(room.gameState, playerId, normalizeTarget(payload));

    if (!result.ok) {
      emitActionError(socket, 'fire_cell', result.error, { room: serializeRoom(room) });
      return;
    }

    room.gameState = result.gameState;
    room.updatedAt = nowIso();
    const shotPayload = createShotPayload(room, result.shot);
    const attacker = getRoomPlayer(room, result.shot.attackerId);
    const defender = getRoomPlayer(room, result.shot.defenderId);

    if (attacker?.socketId) {
      io.to(attacker.socketId).emit('shot_result', {
        ...shotPayload,
        gameView: getPlayerGameView(room.gameState, result.shot.attackerId),
      });
    }
    if (defender?.socketId) {
      io.to(defender.socketId).emit('opponent_shot', {
        ...shotPayload,
        gameView: getPlayerGameView(room.gameState, result.shot.defenderId),
      });
    }

    emitGameViews(room);

    if (room.gameState.turn.winnerId) {
      endMatch(room, room.gameState.turn.winnerId, 'fleet_destroyed');
      return;
    }

    io.to(room.code).emit('turn_changed', room.gameState.turn.currentPlayerId);
    io.to(room.code).emit('turn_updated', {
      roomCode: room.code,
      currentPlayerId: room.gameState.turn.currentPlayerId,
      turnNumber: room.gameState.turn.turnNumber,
    });
    emitRoomState(room);
  }

  function handleSurrender(socket) {
    const playerId = getPlayerId(socket);
    const room = getRoomForPlayer(playerId);

    if (!room || room.phase !== ROOM_PHASE.PLAYING) {
      emitActionError(socket, 'surrender', 'MATCH_NOT_STARTED');
      return;
    }

    const winner = room.players.find((player) => player.id !== playerId);

    if (!winner) {
      emitActionError(socket, 'surrender', 'OPPONENT_NOT_FOUND');
      return;
    }

    endMatch(room, winner.id, 'surrender');
  }

  function handleRequestRematch(socket) {
    const playerId = getPlayerId(socket);
    const room = getRoomForPlayer(playerId);

    if (!room) {
      emitActionError(socket, 'request_rematch', 'PLAYER_NOT_IN_ROOM');
      return;
    }

    if (room.phase !== ROOM_PHASE.ENDED || !room.gameState) {
      emitActionError(socket, 'request_rematch', 'MATCH_NOT_ENDED');
      return;
    }

    if (room.players.length !== MAX_PLAYERS || room.players.some((player) => !player.connected)) {
      emitActionError(socket, 'request_rematch', 'OPPONENT_NOT_AVAILABLE');
      return;
    }

    room.rematchVotes.add(playerId);
    io.to(room.code).emit('rematch_state_updated', {
      roomCode: room.code,
      votes: Array.from(room.rematchVotes),
      needed: MAX_PLAYERS,
    });

    if (room.players.every((player) => room.rematchVotes.has(player.id))) {
      room.gameState = resetMatchState(room.gameState, {
        playerIds: room.players.map((player) => player.id),
      });
      room.players.forEach((player) => {
        player.ready = false;
      });
      room.pendingPlacements.clear();
      room.rematchVotes.clear();
      room.phase = ROOM_PHASE.PLACEMENT;
      room.updatedAt = nowIso();

      io.to(room.code).emit('rematch_started', createPublicState(room));
      io.to(room.code).emit('placement_started', createPublicState(room));
      emitRoomState(room);
      emitGameViews(room);
    }
  }

  function restoreSession(socket, playerId) {
    const room = getRoomForPlayer(playerId);
    const player = room ? getRoomPlayer(room, playerId) : null;

    if (!room || !player || player.connected) {
      return false;
    }

    const timer = disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(playerId);
    }

    player.connected = true;
    player.socketId = socket.id;
    player.disconnectedAt = null;
    room.updatedAt = nowIso();
    socket.join(room.code);
    socket.emit('session_restored', createPublicState(room, {
      playerId,
      gameView: room.gameState?.players[playerId]
        ? getPlayerGameView(room.gameState, playerId)
        : null,
    }));
    io.to(room.code).emit('opponent_reconnected', {
      roomCode: room.code,
      playerId,
      playerName: player.name,
    });
    emitRoomState(room);
    emitGameViewToPlayer(room, player);
    logger.info('session_restored', { roomCode: room.code, playerId });
    return true;
  }

  function scheduleDisconnect(socket) {
    const playerId = getPlayerId(socket);
    const room = getRoomForPlayer(playerId);
    const player = room ? getRoomPlayer(room, playerId) : null;

    socketPlayers.delete(socket.id);
    rateLimits.delete(socket.id);

    if (!room || !player || player.socketId !== socket.id) {
      return;
    }

    player.connected = false;
    player.socketId = null;
    player.disconnectedAt = nowIso();
    room.updatedAt = nowIso();
    const reconnectDeadline = new Date(Date.now() + reconnectGraceMs).toISOString();

    io.to(room.code).emit('opponent_disconnected', {
      roomCode: room.code,
      playerId,
      playerName: player.name,
      reconnectDeadline,
      room: serializeRoom(room),
    });
    emitRoomState(room);

    const timer = setTimeout(() => {
      disconnectTimers.delete(playerId);
      removePlayerFromRoom(playerId, 'disconnect_timeout');
    }, reconnectGraceMs);
    timer.unref?.();
    disconnectTimers.set(playerId, timer);
  }

  function consumeRateLimit(socket, event) {
    const now = Date.now();
    const current = rateLimits.get(socket.id);
    const state = !current || now - current.windowStartedAt >= rateLimitWindowMs
      ? { windowStartedAt: now, count: 0 }
      : current;
    state.count += 1;
    rateLimits.set(socket.id, state);

    if (state.count <= rateLimitMaxEvents) {
      return true;
    }

    emitActionError(socket, event, 'RATE_LIMITED');
    return false;
  }

  function registerAction(socket, event, handler) {
    socket.on(event, (payload = {}) => {
      if (!consumeRateLimit(socket, event)) {
        return;
      }
      if (!isPayloadSafe(payload)) {
        emitActionError(socket, event, 'PAYLOAD_TOO_LARGE');
        return;
      }

      try {
        handler(payload);
      } catch (error) {
        logger.error('socket_action_failed', {
          event,
          playerId: getPlayerId(socket),
          error: error.message,
        });
        emitActionError(socket, event, 'INTERNAL_ERROR');
      }
    });
  }

  io.on('connection', (socket) => {
    const requestedToken = typeof socket.handshake.auth?.playerToken === 'string'
      ? socket.handshake.auth.playerToken.trim()
      : '';
    let playerId = requestedToken || randomUUID();
    const existingRoom = getRoomForPlayer(playerId);
    const existingPlayer = existingRoom ? getRoomPlayer(existingRoom, playerId) : null;

    if (existingPlayer?.connected) {
      if (requestedToken) {
        const previousSocket = io.sockets.sockets.get(existingPlayer.socketId);
        if (previousSocket && previousSocket.id !== socket.id) {
          socketPlayers.delete(previousSocket.id);
          previousSocket.disconnect(true);
        }
        existingPlayer.connected = false;
        existingPlayer.socketId = null;
      } else {
        playerId = randomUUID();
      }
    }

    socket.data.playerId = playerId;
    socketPlayers.set(socket.id, playerId);
    const restored = restoreSession(socket, playerId);

    socket.emit('server_ready', {
      playerId,
      playerToken: playerId,
      restored,
      reconnectGraceMs,
      events: [
        'create_room',
        'join_room',
        'player_ready',
        'submit_ships',
        'fire_cell',
        'surrender',
        'request_rematch',
        'leave_room',
      ],
    });

    registerAction(socket, 'create_room', (payload) => handleCreateRoom(socket, payload));
    registerAction(socket, 'join_room', (payload) => handleJoinRoom(socket, payload));
    registerAction(socket, 'player_ready', (payload) => handlePlayerReady(socket, payload));
    registerAction(socket, 'submit_ships', (payload) => handleSubmitShips(socket, payload));
    registerAction(socket, 'fire_cell', (payload) => handleFireCell(socket, payload));
    registerAction(socket, 'surrender', () => handleSurrender(socket));
    registerAction(socket, 'request_rematch', () => handleRequestRematch(socket));
    registerAction(socket, 'leave_room', () => {
      const currentPlayerId = getPlayerId(socket);
      leaveCurrentRoom(currentPlayerId);
      socket.emit('room_left', { playerId: currentPlayerId });
    });
    socket.on('disconnect', () => scheduleDisconnect(socket));
  });

  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - roomIdleTtlMs;

    for (const room of rooms.values()) {
      if (
        Date.parse(room.updatedAt) < cutoff
        && room.players.every((player) => !player.connected)
      ) {
        room.players.forEach((player) => {
          playerRooms.delete(player.id);
          const timer = disconnectTimers.get(player.id);
          if (timer) {
            clearTimeout(timer);
            disconnectTimers.delete(player.id);
          }
        });
        rooms.delete(room.code);
      }
    }
  }, Math.min(roomIdleTtlMs || 60_000, 60_000));
  cleanupInterval.unref?.();

  if (existsSync(distPath)) {
    app.use(express.static(distPath, {
      maxAge: isProduction ? '1h' : 0,
      index: false,
    }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/socket.io') || req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return {
    app,
    httpServer,
    io,
    rooms,
    playerRooms,
    socketPlayers,
    listen(callback) {
      return httpServer.listen(port, callback);
    },
    async close() {
      clearInterval(cleanupInterval);
      disconnectTimers.forEach((timer) => clearTimeout(timer));
      disconnectTimers.clear();
      await new Promise((resolve) => io.close(resolve));
      if (httpServer.listening) {
        await new Promise((resolve, reject) => {
          httpServer.close((error) => (error ? reject(error) : resolve()));
        });
      }
    },
  };
}
