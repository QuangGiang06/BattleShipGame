export const DEFAULT_BOARD_SIZE = 10;

export const CELL_VIEW = Object.freeze({
  EMPTY: 'empty',
  SHIP: 'ship',
  HIT: 'hit',
  MISS: 'miss',
  SUNK: 'sunk',
});

export function createCell() {
  return {
    shipId: null,
    isShot: false,
  };
}

export function createBoard(size = DEFAULT_BOARD_SIZE) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error('BOARD_SIZE_INVALID');
  }

  return {
    size,
    cells: Array.from({ length: size * size }, createCell),
  };
}

export function cloneBoard(board) {
  return {
    size: board.size,
    cells: board.cells.map((cell) => ({ ...cell })),
  };
}

export function isValidIndex(board, index) {
  return Number.isInteger(index) && index >= 0 && index < board.cells.length;
}

export function isInsideBoard(board, row, col) {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < board.size &&
    col >= 0 &&
    col < board.size
  );
}

export function indexFromCoordinate(board, row, col) {
  if (!isInsideBoard(board, row, col)) {
    return null;
  }

  return row * board.size + col;
}

export function coordinateFromIndex(board, index) {
  if (!isValidIndex(board, index)) {
    return null;
  }

  return {
    row: Math.floor(index / board.size),
    col: index % board.size,
  };
}

export function normalizeTarget(board, target) {
  if (Number.isInteger(target)) {
    const coordinate = coordinateFromIndex(board, target);

    if (!coordinate) {
      return null;
    }

    return {
      index: target,
      ...coordinate,
    };
  }

  if (!target || typeof target !== 'object') {
    return null;
  }

  if (Number.isInteger(target.index)) {
    return normalizeTarget(board, target.index);
  }

  const index = indexFromCoordinate(board, target.row, target.col);

  if (index === null) {
    return null;
  }

  return {
    index,
    row: target.row,
    col: target.col,
  };
}

export function getCell(board, target) {
  const normalizedTarget = normalizeTarget(board, target);

  if (!normalizedTarget) {
    return null;
  }

  return board.cells[normalizedTarget.index];
}

export function placeShipCells(board, shipId, positions) {
  const nextBoard = cloneBoard(board);

  for (const index of positions) {
    if (!isValidIndex(nextBoard, index)) {
      throw new Error('SHIP_POSITION_INVALID');
    }

    nextBoard.cells[index] = {
      ...nextBoard.cells[index],
      shipId,
    };
  }

  return nextBoard;
}

export function markShotOnBoard(board, target) {
  const normalizedTarget = normalizeTarget(board, target);

  if (!normalizedTarget) {
    throw new Error('SHOT_TARGET_INVALID');
  }

  const nextBoard = cloneBoard(board);
  const cell = nextBoard.cells[normalizedTarget.index];

  nextBoard.cells[normalizedTarget.index] = {
    ...cell,
    isShot: true,
  };

  return {
    board: nextBoard,
    target: normalizedTarget,
    cell: nextBoard.cells[normalizedTarget.index],
  };
}
