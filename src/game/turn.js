import { GAME_PHASE } from './gameState.js';

export function getOpponentId(gameState, playerId) {
  return gameState.playerOrder.find((candidateId) => candidateId !== playerId) ?? null;
}

export function isPlayersTurn(gameState, playerId) {
  return gameState.turn.phase === GAME_PHASE.BATTLE && gameState.turn.currentPlayerId === playerId;
}

export function startBattle(gameState, firstPlayerId = gameState.playerOrder[0]) {
  if (!gameState.players[firstPlayerId]) {
    throw new Error('FIRST_PLAYER_INVALID');
  }

  if (gameState.playerOrder.length < 2) {
    throw new Error('NOT_ENOUGH_PLAYERS');
  }

  return {
    ...gameState,
    turn: {
      phase: GAME_PHASE.BATTLE,
      currentPlayerId: firstPlayerId,
      winnerId: null,
      turnNumber: 1,
    },
  };
}

export function changeTurn(gameState, nextPlayerId = getOpponentId(gameState, gameState.turn.currentPlayerId)) {
  if (!gameState.players[nextPlayerId]) {
    throw new Error('NEXT_PLAYER_INVALID');
  }

  return {
    ...gameState,
    turn: {
      ...gameState.turn,
      currentPlayerId: nextPlayerId,
      turnNumber: gameState.turn.turnNumber + 1,
    },
  };
}

export function finishGame(gameState, winnerId) {
  if (!gameState.players[winnerId]) {
    throw new Error('WINNER_INVALID');
  }

  return {
    ...gameState,
    turn: {
      ...gameState.turn,
      phase: GAME_PHASE.FINISHED,
      currentPlayerId: null,
      winnerId,
    },
  };
}
