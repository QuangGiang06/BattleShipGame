import { createBoard, DEFAULT_BOARD_SIZE } from './board.js';
import { DEFAULT_FLEET } from './ship.js';

export const GAME_PHASE = Object.freeze({
  PLACEMENT: 'placement',
  BATTLE: 'battle',
  FINISHED: 'finished',
});

export function createPlayerState(id, options = {}) {
  if (!id) {
    throw new Error('PLAYER_ID_REQUIRED');
  }

  return {
    id,
    board: createBoard(options.boardSize ?? DEFAULT_BOARD_SIZE),
    ships: [],
    shots: [],
    ready: false,
  };
}

export function createGameState(playerIds = [], options = {}) {
  const boardSize = options.boardSize ?? DEFAULT_BOARD_SIZE;
  const players = {};

  for (const playerId of playerIds) {
    players[playerId] = createPlayerState(playerId, { boardSize });
  }

  return {
    boardSize,
    shipSet: options.shipSet ?? DEFAULT_FLEET,
    playerOrder: [...playerIds],
    players,
    shotHistory: [],
    turn: {
      phase: GAME_PHASE.PLACEMENT,
      currentPlayerId: null,
      winnerId: null,
      turnNumber: 0,
    },
  };
}

export function getPlayerState(gameState, playerId) {
  return gameState.players[playerId] ?? null;
}

export function updatePlayerState(gameState, playerId, updater) {
  const playerState = getPlayerState(gameState, playerId);

  if (!playerState) {
    throw new Error('PLAYER_NOT_FOUND');
  }

  return {
    ...gameState,
    players: {
      ...gameState.players,
      [playerId]: updater(playerState),
    },
  };
}

export function setPlayerReady(gameState, playerId, ready = true) {
  return updatePlayerState(gameState, playerId, (playerState) => ({
    ...playerState,
    ready,
  }));
}

export function areAllPlayersReady(gameState) {
  return (
    gameState.playerOrder.length >= 2 &&
    gameState.playerOrder.every((playerId) => gameState.players[playerId]?.ready)
  );
}

export function resetMatchState(gameState, options = {}) {
  return createGameState(options.playerIds ?? gameState.playerOrder, {
    boardSize: options.boardSize ?? gameState.boardSize,
    shipSet: options.shipSet ?? gameState.shipSet,
  });
}
