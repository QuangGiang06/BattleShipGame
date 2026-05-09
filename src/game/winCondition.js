import { areAllShipsSunk } from './ship.js';

export function checkPlayerDefeated(playerState) {
  return areAllShipsSunk(playerState.ships);
}

export function checkWinner(gameState) {
  const alivePlayerIds = gameState.playerOrder.filter(
    (playerId) => !checkPlayerDefeated(gameState.players[playerId]),
  );

  if (gameState.playerOrder.length >= 2 && alivePlayerIds.length === 1) {
    return alivePlayerIds[0];
  }

  return null;
}

export function isGameOver(gameState) {
  return checkWinner(gameState) !== null;
}
