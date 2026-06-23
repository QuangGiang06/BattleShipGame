import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CELL_VIEW } from './board.js';
import { fireAtCell, SHOT_RESULT } from './attack.js';
import { createGameState, GAME_PHASE, resetMatchState } from './gameState.js';
import { placeShips, validateFleetPlacements, validateShipPlacement } from './placement.js';
import { startBattle } from './turn.js';
import { getPlayerGameView, getVisibleOpponentBoard } from './visibility.js';
import { checkWinner } from './winCondition.js';

function placeFleetForPlayer(gameState, playerId, placements) {
  const placementResult = placeShips(gameState.players[playerId], placements);
  assert.equal(placementResult.ok, true, placementResult.error);

  return {
    ...gameState,
    players: {
      ...gameState.players,
      [playerId]: placementResult.playerState,
    },
  };
}

function createReadyGame() {
  let gameState = createGameState(['p1', 'p2']);
  gameState = placeFleetForPlayer(gameState, 'p1', [
    { id: 'p1-destroyer', length: 2, row: 0, col: 0, orientation: 'horizontal' },
  ]);
  gameState = placeFleetForPlayer(gameState, 'p2', [
    { id: 'p2-destroyer', length: 2, row: 5, col: 5, orientation: 'horizontal' },
  ]);

  return startBattle(gameState, 'p1');
}

test('validateShipPlacement rejects out-of-bounds and overlapping ships', () => {
  const gameState = createGameState(['p1', 'p2']);
  const playerState = gameState.players.p1;
  const outOfBounds = validateShipPlacement(playerState.board, 5, { row: 0, col: 6 }, 'horizontal');

  assert.equal(outOfBounds.valid, false);
  assert.equal(outOfBounds.reason, 'SHIP_OUT_OF_BOUNDS');

  const placed = placeShips(playerState, [
    { id: 'test-ship', length: 3, row: 2, col: 2, orientation: 'horizontal' },
  ]);
  const overlapping = validateShipPlacement(placed.playerState.board, 2, { row: 2, col: 3 }, 'vertical');

  assert.equal(overlapping.valid, false);
  assert.equal(overlapping.reason, 'SHIP_OVERLAP');
});

test('fireAtCell records hit, rejects duplicate shot, sinks ship, and finds winner', () => {
  const gameState = createReadyGame();
  const firstShot = fireAtCell(gameState, 'p1', { row: 5, col: 5 });

  assert.equal(firstShot.ok, true);
  assert.equal(firstShot.result, SHOT_RESULT.HIT);
  assert.equal(firstShot.gameState.turn.currentPlayerId, 'p1');

  const duplicateShot = fireAtCell(firstShot.gameState, 'p1', { row: 5, col: 5 });
  assert.equal(duplicateShot.ok, false);
  assert.equal(duplicateShot.error, 'CELL_ALREADY_SHOT');

  const secondShot = fireAtCell(firstShot.gameState, 'p1', { row: 5, col: 6 });

  assert.equal(secondShot.ok, true);
  assert.equal(secondShot.result, SHOT_RESULT.SUNK);
  assert.equal(checkWinner(secondShot.gameState), 'p1');
  assert.equal(secondShot.gameState.turn.phase, GAME_PHASE.FINISHED);
  assert.equal(secondShot.gameState.turn.winnerId, 'p1');
});

test('a miss changes turn and opponent visibility hides unshot ships', () => {
  const gameState = createReadyGame();
  const missedShot = fireAtCell(gameState, 'p1', { row: 0, col: 9 });

  assert.equal(missedShot.ok, true);
  assert.equal(missedShot.result, SHOT_RESULT.MISS);
  assert.equal(missedShot.gameState.turn.currentPlayerId, 'p2');

  const opponentBoard = getVisibleOpponentBoard(missedShot.gameState.players.p2);
  const missedCell = opponentBoard.find((cell) => cell.row === 0 && cell.col === 9);
  const hiddenShipCell = opponentBoard.find((cell) => cell.row === 5 && cell.col === 5);

  assert.equal(missedCell.state, CELL_VIEW.MISS);
  assert.equal(missedCell.shipId, null);
  assert.equal(hiddenShipCell.state, CELL_VIEW.EMPTY);
  assert.equal(hiddenShipCell.shipId, null);
});

test('resetMatchState clears boards, ships, shots, and turn state', () => {
  const gameState = createReadyGame();
  const shotResult = fireAtCell(gameState, 'p1', { row: 0, col: 9 });
  const resetState = resetMatchState(shotResult.gameState);

  assert.deepEqual(resetState.playerOrder, ['p1', 'p2']);
  assert.equal(resetState.turn.phase, GAME_PHASE.PLACEMENT);
  assert.equal(resetState.turn.currentPlayerId, null);
  assert.equal(resetState.shotHistory.length, 0);
  assert.equal(resetState.players.p1.ready, false);
  assert.equal(resetState.players.p1.ships.length, 0);
  assert.equal(resetState.players.p2.board.cells.every((cell) => cell.shipId === null && !cell.isShot), true);
});

test('validateFleetPlacements requires exactly the standard fleet', () => {
  const validFleet = [
    { id: 'carrier', length: 5 },
    { id: 'battleship', length: 4 },
    { id: 'cruiser', length: 3 },
    { id: 'submarine', length: 3 },
    { id: 'destroyer', length: 2 },
  ];

  assert.deepEqual(validateFleetPlacements(validFleet), { valid: true, reason: null });
  assert.equal(validateFleetPlacements(validFleet.slice(0, 4)).reason, 'FLEET_SHIP_COUNT_MISMATCH');
  assert.equal(
    validateFleetPlacements(validFleet.map((ship, index) => ({ ...ship, length: index === 0 ? 4 : ship.length }))).reason,
    'FLEET_COMPOSITION_INVALID',
  );
  assert.equal(
    validateFleetPlacements(validFleet.map((ship) => ({ ...ship, id: 'duplicate' }))).reason,
    'FLEET_SHIP_ID_DUPLICATED',
  );
});

test('fireAtCell rejects shots before battle and from the wrong player', () => {
  const placementGame = createGameState(['p1', 'p2']);
  assert.equal(fireAtCell(placementGame, 'p1', 0).error, 'MATCH_NOT_IN_BATTLE_PHASE');

  const battleGame = createReadyGame();
  assert.equal(fireAtCell(battleGame, 'p2', 0).error, 'NOT_PLAYER_TURN');
  assert.equal(fireAtCell(battleGame, 'p1', 100).error, 'SHOT_TARGET_INVALID');
});

test('game view exposes own fleet but only reveals sunk opponent ships', () => {
  const gameState = createReadyGame();
  const initialView = getPlayerGameView(gameState, 'p1');

  assert.deepEqual(initialView.ownShips[0].positions, [0, 1]);
  assert.deepEqual(initialView.opponentShips.p2[0].positions, []);
  assert.equal(initialView.opponentShips.p2[0].sunk, false);

  const firstShot = fireAtCell(gameState, 'p1', { row: 5, col: 5 });
  const secondShot = fireAtCell(firstShot.gameState, 'p1', { row: 5, col: 6 });
  const finalView = getPlayerGameView(secondShot.gameState, 'p1');

  assert.equal(finalView.opponentShips.p2[0].sunk, true);
  assert.deepEqual(finalView.opponentShips.p2[0].positions, [55, 56]);
});
