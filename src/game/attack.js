import { getCell, markShotOnBoard, normalizeTarget } from './board.js';
import { GAME_PHASE } from './gameState.js';
import { applyHitToShip, isShipSunk } from './ship.js';
import { changeTurn, finishGame, getOpponentId, isPlayersTurn } from './turn.js';
import { checkWinner } from './winCondition.js';

export const SHOT_RESULT = Object.freeze({
  HIT: 'hit',
  MISS: 'miss',
  SUNK: 'sunk',
});

function getDefenderId(gameState, attackerId, options) {
  return options.defenderId ?? getOpponentId(gameState, attackerId);
}

export function checkSunkShip(playerState, shipId) {
  const ship = playerState.ships.find((candidateShip) => candidateShip.id === shipId);

  return ship ? isShipSunk(ship) : false;
}

export function fireAtCell(gameState, attackerId, target, options = {}) {
  if (gameState.turn.phase !== GAME_PHASE.BATTLE) {
    return {
      ok: false,
      error: 'MATCH_NOT_IN_BATTLE_PHASE',
      gameState,
    };
  }

  if (!isPlayersTurn(gameState, attackerId)) {
    return {
      ok: false,
      error: 'NOT_PLAYER_TURN',
      gameState,
    };
  }

  const defenderId = getDefenderId(gameState, attackerId, options);
  const attackerState = gameState.players[attackerId];
  const defenderState = gameState.players[defenderId];

  if (!attackerState || !defenderState || attackerId === defenderId) {
    return {
      ok: false,
      error: 'SHOT_PLAYERS_INVALID',
      gameState,
    };
  }

  const normalizedTarget = normalizeTarget(defenderState.board, target);

  if (!normalizedTarget) {
    return {
      ok: false,
      error: 'SHOT_TARGET_INVALID',
      gameState,
    };
  }

  const targetCell = getCell(defenderState.board, normalizedTarget.index);

  if (targetCell.isShot) {
    return {
      ok: false,
      error: 'CELL_ALREADY_SHOT',
      gameState,
    };
  }

  const markedShot = markShotOnBoard(defenderState.board, normalizedTarget.index);
  const hitShipId = targetCell.shipId;
  let result = hitShipId ? SHOT_RESULT.HIT : SHOT_RESULT.MISS;
  let nextDefenderShips = defenderState.ships;
  let sunkShip = null;

  if (hitShipId) {
    nextDefenderShips = defenderState.ships.map((ship) =>
      ship.id === hitShipId ? applyHitToShip(ship, normalizedTarget.index) : ship,
    );
    sunkShip = nextDefenderShips.find((ship) => ship.id === hitShipId) ?? null;

    if (sunkShip && isShipSunk(sunkShip)) {
      result = SHOT_RESULT.SUNK;
    }
  }

  const shot = {
    attackerId,
    defenderId,
    index: normalizedTarget.index,
    row: normalizedTarget.row,
    col: normalizedTarget.col,
    result,
    shipId: hitShipId,
    sunkShipId: result === SHOT_RESULT.SUNK ? hitShipId : null,
    turnNumber: gameState.turn.turnNumber,
  };

  const nextDefenderState = {
    ...defenderState,
    board: markedShot.board,
    ships: nextDefenderShips,
  };
  const nextAttackerState = {
    ...attackerState,
    shots: [...attackerState.shots, shot],
  };
  let nextGameState = {
    ...gameState,
    players: {
      ...gameState.players,
      [attackerId]: nextAttackerState,
      [defenderId]: nextDefenderState,
    },
    shotHistory: [...gameState.shotHistory, shot],
  };

  const winnerId = checkWinner(nextGameState);

  if (winnerId) {
    nextGameState = finishGame(nextGameState, winnerId);
  } else if (result === SHOT_RESULT.MISS) {
    nextGameState = changeTurn(nextGameState, defenderId);
  }

  return {
    ok: true,
    gameState: nextGameState,
    shot,
    result,
    hit: hitShipId !== null,
    sunkShip,
  };
}
