import { indexFromCoordinate, isInsideBoard, placeShipCells, normalizeTarget } from './board.js';
import { createShip, normalizeOrientation, ORIENTATION } from './ship.js';

function getPlacementStart(placement) {
  if (placement.start !== undefined) {
    return placement.start;
  }

  if (placement.index !== undefined) {
    return placement.index;
  }

  return {
    row: placement.row,
    col: placement.col,
  };
}

function getShipInput(placement) {
  if (placement.ship) {
    return placement.ship;
  }

  return {
    id: placement.shipId ?? placement.id,
    name: placement.name,
    length: placement.length,
  };
}

export function validateShipPlacement(board, shipLength, start, orientation = ORIENTATION.HORIZONTAL) {
  if (!Number.isInteger(shipLength) || shipLength <= 0) {
    return {
      valid: false,
      reason: 'SHIP_LENGTH_INVALID',
      cells: [],
    };
  }

  const normalizedOrientation = normalizeOrientation(orientation);

  if (!normalizedOrientation) {
    return {
      valid: false,
      reason: 'SHIP_ORIENTATION_INVALID',
      cells: [],
    };
  }

  const startTarget = normalizeTarget(board, start);

  if (!startTarget) {
    return {
      valid: false,
      reason: 'SHIP_START_INVALID',
      cells: [],
    };
  }

  const cells = [];

  for (let offset = 0; offset < shipLength; offset += 1) {
    const row = startTarget.row + (normalizedOrientation === ORIENTATION.VERTICAL ? offset : 0);
    const col = startTarget.col + (normalizedOrientation === ORIENTATION.HORIZONTAL ? offset : 0);

    if (!isInsideBoard(board, row, col)) {
      return {
        valid: false,
        reason: 'SHIP_OUT_OF_BOUNDS',
        cells: [],
      };
    }

    const index = indexFromCoordinate(board, row, col);
    const cell = board.cells[index];

    if (cell.shipId !== null) {
      return {
        valid: false,
        reason: 'SHIP_OVERLAP',
        cells: [],
      };
    }

    cells.push(index);
  }

  return {
    valid: true,
    reason: null,
    cells,
  };
}

export function placeShip(playerState, shipInput, start, orientation = ORIENTATION.HORIZONTAL) {
  const ship = createShip(shipInput, playerState.ships.length);

  if (playerState.ships.some((placedShip) => placedShip.id === ship.id)) {
    return {
      ok: false,
      error: 'SHIP_ALREADY_PLACED',
      playerState,
    };
  }

  const validation = validateShipPlacement(playerState.board, ship.length, start, orientation);

  if (!validation.valid) {
    return {
      ok: false,
      error: validation.reason,
      playerState,
      cells: validation.cells,
    };
  }

  const placedShip = {
    ...ship,
    positions: validation.cells,
  };

  return {
    ok: true,
    playerState: {
      ...playerState,
      board: placeShipCells(playerState.board, placedShip.id, validation.cells),
      ships: [...playerState.ships, placedShip],
    },
    ship: placedShip,
    cells: validation.cells,
  };
}

export function placeShips(playerState, placements) {
  let nextPlayerState = playerState;
  const placedShips = [];

  for (const placement of placements) {
    const result = placeShip(
      nextPlayerState,
      getShipInput(placement),
      getPlacementStart(placement),
      placement.orientation ?? ORIENTATION.HORIZONTAL,
    );

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        failedPlacement: placement,
        playerState: nextPlayerState,
      };
    }

    nextPlayerState = result.playerState;
    placedShips.push(result.ship);
  }

  return {
    ok: true,
    playerState: {
      ...nextPlayerState,
      ready: true,
    },
    ships: placedShips,
  };
}
