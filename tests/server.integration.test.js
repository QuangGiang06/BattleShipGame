import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { io as createClient } from 'socket.io-client';

import { createBattleshipServer, ROOM_PHASE } from '../server/app.js';

const runningServers = [];
const connectedClients = [];

afterEach(async () => {
  connectedClients.splice(0).forEach((socket) => socket.disconnect());

  while (runningServers.length > 0) {
    await runningServers.pop().close();
  }
});

function waitEvent(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const handler = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, handler);
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function startTestServer(options = {}) {
  const server = createBattleshipServer({
    port: 0,
    corsOrigin: '*',
    reconnectGraceMs: 500,
    roomIdleTtlMs: 60_000,
    selectFirstPlayer: (players) => players[0],
    logger: { info() {}, error() {} },
    ...options,
  });
  await new Promise((resolve) => server.listen(resolve));
  runningServers.push(server);
  return {
    server,
    url: `http://127.0.0.1:${server.httpServer.address().port}`,
  };
}

async function connectClient(url, playerToken) {
  const socket = createClient(url, {
    auth: playerToken ? { playerToken } : {},
    forceNew: true,
    reconnection: false,
    transports: ['websocket'],
  });
  connectedClients.push(socket);
  const readyPromise = waitEvent(socket, 'server_ready');
  await waitEvent(socket, 'connect');
  const ready = await readyPromise;
  return { socket, ready };
}

function createFleetBoard(rows) {
  const board = Array(100).fill(null);
  const lengths = [5, 4, 3, 3, 2];

  lengths.forEach((length, shipIndex) => {
    for (let col = 0; col < length; col += 1) {
      board[rows[shipIndex] * 10 + col] = 'S';
    }
  });

  return board;
}

async function createReadyMatch(url) {
  const player1 = await connectClient(url);
  const player2 = await connectClient(url);
  const roomCreatedPromise = waitEvent(player1.socket, 'room_created');
  player1.socket.emit('create_room', { playerName: 'Alpha' });
  const created = await roomCreatedPromise;
  const roomJoinedPromise = waitEvent(player2.socket, 'room_joined');
  player2.socket.emit('join_room', {
    roomCode: created.roomCode,
    playerName: 'Bravo',
  });
  await roomJoinedPromise;

  player1.socket.emit('player_ready', { ready: true });
  const placementPromise = waitEvent(player1.socket, 'placement_started');
  player2.socket.emit('player_ready', { ready: true });
  await placementPromise;

  const player1Placed = waitEvent(player1.socket, 'placement_submitted');
  player1.socket.emit('submit_ships', { board: createFleetBoard([0, 1, 2, 3, 4]) });
  await player1Placed;

  const match1 = waitEvent(player1.socket, 'match_started');
  const match2 = waitEvent(player2.socket, 'match_started');
  player2.socket.emit('submit_ships', { board: createFleetBoard([5, 6, 7, 8, 9]) });
  const [player1Match, player2Match] = await Promise.all([match1, match2]);

  return {
    player1,
    player2,
    roomCode: created.roomCode,
    player1Match,
    player2Match,
  };
}

test('two players can complete a full match and request a rematch', async () => {
  const { url } = await startTestServer();
  const match = await createReadyMatch(url);

  assert.equal(match.player1Match.firstTurn, match.player1.ready.playerId);
  assert.equal(match.player2Match.gameView.isMyTurn, false);
  assert.equal(
    match.player1Match.gameView.opponentBoards[match.player2.ready.playerId]
      .every((cell) => cell.shipId === null),
    true,
  );

  const targets = [
    ...Array.from({ length: 5 }, (_, col) => 50 + col),
    ...Array.from({ length: 4 }, (_, col) => 60 + col),
    ...Array.from({ length: 3 }, (_, col) => 70 + col),
    ...Array.from({ length: 3 }, (_, col) => 80 + col),
    ...Array.from({ length: 2 }, (_, col) => 90 + col),
  ];
  let gameOverPromise;

  for (let index = 0; index < targets.length; index += 1) {
    const shotPromise = waitEvent(match.player1.socket, 'shot_result');
    const opponentShotPromise = waitEvent(match.player2.socket, 'opponent_shot');

    if (index === targets.length - 1) {
      gameOverPromise = waitEvent(match.player1.socket, 'game_over');
    }

    match.player1.socket.emit('fire_cell', { index: targets[index] });
    const [shot, opponentShot] = await Promise.all([shotPromise, opponentShotPromise]);
    assert.equal(shot.index, targets[index]);
    assert.equal(opponentShot.index, targets[index]);
    assert.equal(shot.hit, true);
  }

  const gameOver = await gameOverPromise;
  assert.equal(gameOver.winnerId, match.player1.ready.playerId);
  assert.equal(gameOver.reason, 'fleet_destroyed');

  match.player1.socket.emit('request_rematch');
  const rematchPromise = waitEvent(match.player1.socket, 'rematch_started');
  match.player2.socket.emit('request_rematch');
  const rematch = await rematchPromise;
  assert.equal(rematch.room.phase, ROOM_PHASE.PLACEMENT);
  assert.equal(rematch.room.game.phase, 'placement');
});

test('server rejects an invalid fleet and supports surrender', async () => {
  const { url } = await startTestServer();
  const player1 = await connectClient(url);
  const player2 = await connectClient(url);
  const createdPromise = waitEvent(player1.socket, 'room_created');
  player1.socket.emit('create_room', { playerName: 'Alpha' });
  const created = await createdPromise;
  const joinedPromise = waitEvent(player2.socket, 'room_joined');
  player2.socket.emit('join_room', { roomCode: created.roomCode, playerName: 'Bravo' });
  await joinedPromise;

  player1.socket.emit('player_ready', { ready: true });
  const placementPromise = waitEvent(player1.socket, 'placement_started');
  player2.socket.emit('player_ready', { ready: true });
  await placementPromise;

  const invalidFleetError = waitEvent(player1.socket, 'action_error');
  player1.socket.emit('submit_ships', {
    placements: [{ id: 'only-one-ship', length: 2, row: 0, col: 0, orientation: 'horizontal' }],
  });
  assert.equal((await invalidFleetError).error, 'FLEET_SHIP_COUNT_MISMATCH');

  const player1Placed = waitEvent(player1.socket, 'placement_submitted');
  player1.socket.emit('submit_ships', { board: createFleetBoard([0, 1, 2, 3, 4]) });
  await player1Placed;
  const matchStarted = waitEvent(player1.socket, 'match_started');
  player2.socket.emit('submit_ships', { board: createFleetBoard([5, 6, 7, 8, 9]) });
  await matchStarted;

  const gameOverPromise = waitEvent(player1.socket, 'game_over');
  player1.socket.emit('surrender');
  const gameOver = await gameOverPromise;
  assert.equal(gameOver.winnerId, player2.ready.playerId);
  assert.equal(gameOver.reason, 'surrender');
});

test('submitting one fleet does not restart placement for the opponent', async () => {
  const { url } = await startTestServer();
  const player1 = await connectClient(url);
  const player2 = await connectClient(url);
  const createdPromise = waitEvent(player1.socket, 'room_created');
  player1.socket.emit('create_room', { playerName: 'Alpha' });
  const created = await createdPromise;
  const joinedPromise = waitEvent(player2.socket, 'room_joined');
  player2.socket.emit('join_room', { roomCode: created.roomCode, playerName: 'Bravo' });
  await joinedPromise;

  player1.socket.emit('player_ready', { ready: true });
  const placementPromise = waitEvent(player2.socket, 'placement_started');
  player2.socket.emit('player_ready', { ready: true });
  await placementPromise;

  let repeatedPlacementEvents = 0;
  const countPlacement = () => {
    repeatedPlacementEvents += 1;
  };
  player2.socket.on('placement_started', countPlacement);
  const submittedPromise = waitEvent(player1.socket, 'placement_submitted');
  player1.socket.emit('submit_ships', { board: createFleetBoard([0, 1, 2, 3, 4]) });
  await submittedPromise;
  await delay(30);
  player2.socket.off('placement_started', countPlacement);

  assert.equal(repeatedPlacementEvents, 0);
});

test('a disconnected player can restore the active session with a stable token', async () => {
  const { url } = await startTestServer({ reconnectGraceMs: 1000 });
  const match = await createReadyMatch(url);
  const disconnectedPromise = waitEvent(match.player2.socket, 'opponent_disconnected');
  match.player1.socket.disconnect();
  const disconnected = await disconnectedPromise;
  assert.equal(disconnected.playerId, match.player1.ready.playerId);

  const restoredSocket = createClient(url, {
    auth: { playerToken: match.player1.ready.playerToken },
    forceNew: true,
    reconnection: false,
    transports: ['websocket'],
  });
  connectedClients.push(restoredSocket);
  const restoredPromise = waitEvent(restoredSocket, 'session_restored');
  const readyPromise = waitEvent(restoredSocket, 'server_ready');
  await waitEvent(restoredSocket, 'connect');
  const [restored, ready] = await Promise.all([restoredPromise, readyPromise]);

  assert.equal(ready.restored, true);
  assert.equal(restored.roomCode, match.roomCode);
  assert.equal(restored.room.phase, ROOM_PHASE.PLAYING);
  assert.equal(restored.gameView.viewerId, match.player1.ready.playerId);
});
