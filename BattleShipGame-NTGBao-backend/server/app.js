import express from 'express';
import { createServer } from 'node:http';
import { randomInt } from 'node:crypto';
import { Server } from 'socket.io';

import { fireAtCell } from '../src/game/attack.js';
import { areAllPlayersReady, createGameState, resetMatchState } from '../src/game/gameState.js';
import { placeShips } from '../src/game/placement.js';
import { startBattle } from '../src/game/turn.js';
import { getPlayerGameView } from '../src/game/visibility.js';
import { normalizeShipPlacements } from './placementPayload.js';

const MAX_PLAYERS = 2;
const ROOM_CODE_LENGTH = 5;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

function readName(payload, fallback) {
  const value = payload?.playerName ?? payload?.name ?? payload?.nickname;
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readRoomCode(payload) {
  const value = payload?.roomCode ?? payload?.code;
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function createRoomCode(rooms) {
  for (;;) {
    const code = Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]).join('');

    if (!rooms.has(code)) {
      return code;
    }
  }
}

function createPlayer(socket, name) {
  return {
    id: socket.id,
    socketId: socket.id,
    name,
    ready: false,
    connected: true,
  };
}

function isJoinable(room) {
  return room.players.length < MAX_PLAYERS && [ROOM_PHASE.WAITING, ROOM_PHASE.READY].includes(room.phase);
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
  const resultForCurrentFrontend = shot.result === 'sunk' ? 'hit' : shot.result;

  return {
    roomCode: room.code,
    attackerId: shot.attackerId,
    defenderId: shot.defenderId,
    index: shot.index,
    row: shot.row,
    col: shot.col,
    result: resultForCurrentFrontend,
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

export function createBattleshipServer(options = {}) {
  const app = express();
  const httpServer = createServer(app);
  const corsOrigin = options.corsOrigin ?? process.env.CORS_ORIGIN ?? '*';
  const port = Number(options.port ?? process.env.PORT ?? 3000);
  const rooms = new Map();
  const playerRooms = new Map();

  app.use(express.json());
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'Battleship Socket Server',
      ok: true,
      socketPath: '/socket.io',
      events: ['create_room', 'join_room', 'player_ready', 'submit_ships', 'fire_cell', 'request_rematch'],
    });
  });

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      rooms: rooms.size,
      players: playerRooms.size,
    });
  });

  app.get('/rooms', (_req, res) => {
    res.json({
      rooms: Array.from(rooms.values()).map(serializeRoom),
    });
  });

  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  function emitRoomState(room, extra = {}) {
    const state = createPublicState(room, extra);
    io.to(room.code).emit('room_state_updated', state);
    io.to(room.code).emit('room_update', state);
  }

  function emitGameViews(room) {
    if (!room.gameState) {
      return;
    }

    for (const player of room.players) {
      if (!player.connected) {
        continue;
      }

      io.to(player.socketId).emit('game_state_updated', {
        roomCode: room.code,
        gameView: getPlayerGameView(room.gameState, player.id),
      });
    }
  }

  function emitActionError(socket, event, error, details = {}) {
    const payload = { event, error, ...details };
    socket.emit('action_error', payload);
    socket.emit('room_error', payload);
  }

  function createRoomForSocket(socket, payload = {}) {
    leaveCurrentRoom(socket.id, { silent: true });

    const code = createRoomCode(rooms);
    const room = {
      code,
      phase: ROOM_PHASE.WAITING,
      players: [createPlayer(socket, readName(payload, 'Player 1'))],
      gameState: null,
      pendingPlacements: new Map(),
      rematchVotes: new Set(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    rooms.set(code, room);
    playerRooms.set(socket.id, code);
    socket.join(code);
    return room;
  }

  function joinRoom(socket, room, payload = {}) {
    const existingPlayer = room.players.find((player) => player.id === socket.id);

    if (existingPlayer) {
      existingPlayer.connected = true;
      existingPlayer.socketId = socket.id;
      room.updatedAt = nowIso();
      return room;
    }

    if (!isJoinable(room)) {
      throw new Error('ROOM_FULL');
    }

    leaveCurrentRoom(socket.id, { silent: true });
    room.players.push(createPlayer(socket, readName(payload, `Player ${room.players.length + 1}`)));
    room.phase = room.players.length === MAX_PLAYERS ? ROOM_PHASE.READY : ROOM_PHASE.WAITING;
    room.updatedAt = nowIso();
    playerRooms.set(socket.id, room.code);
    socket.join(room.code);

    if (room.pendingPlacements.size > 0 && room.players.length === MAX_PLAYERS) {
      startPlacement(room);
      applyPendingPlacements(room);
    }

    return room;
  }

  function ensureAutoRoom(socket, payload = {}) {
    const existingRoom = getRoomForSocket(socket.id);

    if (existingRoom) {
      return existingRoom;
    }

    const room = Array.from(rooms.values()).find(isJoinable);

    if (room) {
      return joinRoom(socket, room, payload);
    }

    return createRoomForSocket(socket, payload);
  }

  function getRoomForSocket(playerId) {
    const roomCode = playerRooms.get(playerId);
    return roomCode ? rooms.get(roomCode) ?? null : null;
  }

  function getRoomPlayer(room, playerId) {
    return room.players.find((player) => player.id === playerId) ?? null;
  }

  function startPlacement(room) {
    if (room.players.length < MAX_PLAYERS) {
      return false;
    }

    if (!room.gameState) {
      room.gameState = createGameState(room.players.map((player) => player.id));
    }

    room.phase = ROOM_PHASE.PLACEMENT;
    room.updatedAt = nowIso();
    io.to(room.code).emit('placement_started', createPublicState(room));
    return true;
  }

  function applyPlayerShips(room, playerId, payload) {
    if (!room.gameState?.players[playerId]) {
      return { ok: false, error: 'PLAYER_NOT_IN_GAME' };
    }

    if (room.gameState.players[playerId].ready) {
      return { ok: true, alreadySubmitted: true };
    }

    try {
      const placements = normalizeShipPlacements(payload, {
        fleet: room.gameState.shipSet,
        boardSize: room.gameState.boardSize,
      });
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
    const results = [];

    for (const [playerId, payload] of room.pendingPlacements.entries()) {
      const result = applyPlayerShips(room, playerId, payload);
      results.push({ playerId, ...result });

      if (result.ok) {
        room.pendingPlacements.delete(playerId);
        io.to(playerId).emit('placement_submitted', {
          roomCode: room.code,
          playerId,
          placements: result.placements,
          room: serializeRoom(room),
        });
      } else {
        io.to(playerId).emit('action_error', {
          event: 'submit_ships',
          error: result.error,
        });
      }
    }

    return results;
  }

  function startMatchIfReady(room) {
    if (!room.gameState || !areAllPlayersReady(room.gameState)) {
      return false;
    }

    if (room.phase === ROOM_PHASE.PLAYING) {
      return true;
    }

    const firstPlayerId = room.gameState.playerOrder[0];
    room.gameState = startBattle(room.gameState, firstPlayerId);
    room.phase = ROOM_PHASE.PLAYING;
    room.rematchVotes.clear();
    room.updatedAt = nowIso();

    for (const player of room.players) {
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
    return true;
  }

  function leaveCurrentRoom(playerId, options = {}) {
    const room = getRoomForSocket(playerId);

    if (!room) {
      return;
    }

    const player = getRoomPlayer(room, playerId);
    const wasInMatch = [ROOM_PHASE.PLACEMENT, ROOM_PHASE.PLAYING].includes(room.phase);
    room.pendingPlacements.delete(playerId);
    playerRooms.delete(playerId);
    io.sockets.sockets.get(playerId)?.leave(room.code);

    if (player) {
      player.connected = false;
      player.socketId = null;
    }

    room.players = room.players.filter((candidate) => candidate.id !== playerId);

    if (room.players.length === 0) {
      rooms.delete(room.code);
      return;
    }

    room.phase = wasInMatch ? ROOM_PHASE.ENDED : ROOM_PHASE.WAITING;
    room.updatedAt = nowIso();

    if (!options.silent) {
      io.to(room.code).emit('opponent_disconnected', {
        roomCode: room.code,
        playerId,
        room: serializeRoom(room),
      });
      emitRoomState(room);
    }
  }

  function handleCreateRoom(socket, payload = {}) {
    const room = createRoomForSocket(socket, payload);
    socket.emit('room_created', createPublicState(room, { playerId: socket.id }));
    socket.emit('room_joined', createPublicState(room, { playerId: socket.id }));
    emitRoomState(room);
  }

  function handleJoinRoom(socket, payload = {}) {
    const roomCode = readRoomCode(payload);
    const room = rooms.get(roomCode);

    if (!room) {
      emitActionError(socket, 'join_room', 'ROOM_NOT_FOUND', { roomCode });
      return;
    }

    try {
      joinRoom(socket, room, payload);
      socket.emit('room_joined', createPublicState(room, { playerId: socket.id }));
      emitRoomState(room);
    } catch (error) {
      emitActionError(socket, 'join_room', error.message, { roomCode });
    }
  }

  function handlePlayerReady(socket, payload = {}) {
    const room = getRoomForSocket(socket.id) ?? ensureAutoRoom(socket, payload);
    const player = getRoomPlayer(room, socket.id);

    if (!player) {
      emitActionError(socket, 'player_ready', 'PLAYER_NOT_IN_ROOM');
      return;
    }

    player.ready = payload.ready ?? true;
    room.phase = room.players.length === MAX_PLAYERS ? ROOM_PHASE.READY : ROOM_PHASE.WAITING;
    room.updatedAt = nowIso();

    if (room.players.length === MAX_PLAYERS && room.players.every((candidate) => candidate.ready)) {
      startPlacement(room);
    }

    emitRoomState(room);
  }

  function handleSubmitShips(socket, payload = {}) {
    const room = ensureAutoRoom(socket, payload);
    room.pendingPlacements.set(socket.id, payload);

    if (room.players.length < MAX_PLAYERS) {
      room.phase = ROOM_PHASE.WAITING;
      room.updatedAt = nowIso();
      socket.emit('waiting_for_opponent', createPublicState(room, { playerId: socket.id }));
      emitRoomState(room);
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
    const room = getRoomForSocket(socket.id);

    if (!room) {
      emitActionError(socket, 'fire_cell', 'PLAYER_NOT_IN_ROOM');
      return;
    }

    if (room.phase !== ROOM_PHASE.PLAYING) {
      emitActionError(socket, 'fire_cell', 'MATCH_NOT_STARTED', { room: serializeRoom(room) });
      return;
    }

    const result = fireAtCell(room.gameState, socket.id, normalizeTarget(payload));

    if (!result.ok) {
      emitActionError(socket, 'fire_cell', result.error, { room: serializeRoom(room) });
      return;
    }

    room.gameState = result.gameState;
    room.phase = room.gameState.turn.winnerId ? ROOM_PHASE.ENDED : ROOM_PHASE.PLAYING;
    room.updatedAt = nowIso();

    const shotPayload = createShotPayload(room, result.shot);
    io.to(result.shot.attackerId).emit('shot_result', {
      ...shotPayload,
      gameView: getPlayerGameView(room.gameState, result.shot.attackerId),
    });
    io.to(result.shot.defenderId).emit('opponent_shot', {
      ...shotPayload,
      gameView: getPlayerGameView(room.gameState, result.shot.defenderId),
    });

    emitGameViews(room);

    if (room.phase === ROOM_PHASE.ENDED) {
      const endedPayload = {
        roomCode: room.code,
        winnerId: room.gameState.turn.winnerId,
        loserId: room.players.find((player) => player.id !== room.gameState.turn.winnerId)?.id ?? null,
        room: serializeRoom(room),
      };
      io.to(room.code).emit('match_ended', endedPayload);
      io.to(room.code).emit('game_over', endedPayload);
    } else {
      io.to(room.code).emit('turn_changed', room.gameState.turn.currentPlayerId);
      io.to(room.code).emit('turn_updated', {
        roomCode: room.code,
        currentPlayerId: room.gameState.turn.currentPlayerId,
        turnNumber: room.gameState.turn.turnNumber,
      });
    }

    emitRoomState(room);
  }

  function handleRequestRematch(socket) {
    const room = getRoomForSocket(socket.id);

    if (!room) {
      emitActionError(socket, 'request_rematch', 'PLAYER_NOT_IN_ROOM');
      return;
    }

    if (!room.gameState) {
      emitActionError(socket, 'request_rematch', 'MATCH_NOT_CREATED');
      return;
    }

    room.rematchVotes.add(socket.id);
    io.to(room.code).emit('rematch_state_updated', {
      roomCode: room.code,
      votes: Array.from(room.rematchVotes),
      needed: room.players.length,
    });

    if (room.players.length === MAX_PLAYERS && room.players.every((player) => room.rematchVotes.has(player.id))) {
      room.gameState = resetMatchState(room.gameState, { playerIds: room.players.map((player) => player.id) });
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

  io.on('connection', (socket) => {
    socket.emit('server_ready', {
      playerId: socket.id,
      port,
      events: ['create_room', 'join_room', 'player_ready', 'submit_ships', 'fire_cell', 'request_rematch'],
    });

    socket.on('create_room', (payload) => handleCreateRoom(socket, payload));
    socket.on('join_room', (payload) => handleJoinRoom(socket, payload));
    socket.on('player_ready', (payload) => handlePlayerReady(socket, payload));
    socket.on('submit_ships', (payload) => handleSubmitShips(socket, payload));
    socket.on('fire_cell', (payload) => handleFireCell(socket, payload));
    socket.on('request_rematch', () => handleRequestRematch(socket));
    socket.on('leave_room', () => leaveCurrentRoom(socket.id));
    socket.on('disconnecting', () => leaveCurrentRoom(socket.id));
  });

  return {
    app,
    httpServer,
    io,
    rooms,
    playerRooms,
    listen(callback) {
      return httpServer.listen(port, callback);
    },
  };
}
