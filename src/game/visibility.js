import { CELL_VIEW, coordinateFromIndex } from './board.js';
import { isShipSunk } from './ship.js';

function getSunkShipIds(playerState) {
  return new Set(playerState.ships.filter(isShipSunk).map((ship) => ship.id));
}

export function getBoardView(playerState, options = {}) {
  const hideShips = options.hideShips ?? false;
  const sunkShipIds = getSunkShipIds(playerState);

  return playerState.board.cells.map((cell, index) => {
    const coordinate = coordinateFromIndex(playerState.board, index);
    let state = CELL_VIEW.EMPTY;

    if (cell.isShot && cell.shipId !== null) {
      state = sunkShipIds.has(cell.shipId) ? CELL_VIEW.SUNK : CELL_VIEW.HIT;
    } else if (cell.isShot) {
      state = CELL_VIEW.MISS;
    } else if (cell.shipId !== null && !hideShips) {
      state = CELL_VIEW.SHIP;
    }

    return {
      index,
      row: coordinate.row,
      col: coordinate.col,
      state,
      shipId: hideShips ? null : cell.shipId,
    };
  });
}

export function getOwnBoardView(playerState) {
  return getBoardView(playerState, { hideShips: false });
}

export function getVisibleOpponentBoard(opponentPlayerState) {
  return getBoardView(opponentPlayerState, { hideShips: true });
}

export function getPlayerGameView(gameState, viewerId) {
  const viewerState = gameState.players[viewerId];

  if (!viewerState) {
    throw new Error('PLAYER_NOT_FOUND');
  }

  const opponentBoards = {};

  for (const playerId of gameState.playerOrder) {
    if (playerId !== viewerId) {
      opponentBoards[playerId] = getVisibleOpponentBoard(gameState.players[playerId]);
    }
  }

  return {
    viewerId,
    phase: gameState.turn.phase,
    isMyTurn: gameState.turn.currentPlayerId === viewerId,
    winnerId: gameState.turn.winnerId,
    ownBoard: getOwnBoardView(viewerState),
    opponentBoards,
    shots: viewerState.shots,
  };
}
