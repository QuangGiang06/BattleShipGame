import { DEFAULT_FLEET, normalizeOrientation } from '../src/game/ship.js';

const DEFAULT_BOARD_SIZE = 10;
const OCCUPIED_VALUES = new Set(['S', 's', 'ship', 'SHIP', '1', 1, true]);

function toOrientation(value) {
  const normalizedValue = typeof value === 'string' ? value.toLowerCase() : value;
  const orientation = normalizeOrientation(normalizedValue);

  if (!orientation) {
    throw new Error('SHIP_ORIENTATION_INVALID');
  }

  return orientation;
}

function normalizePlacement(placement, fallbackShip, fallbackIndex) {
  const source = placement.ship ? { ...placement.ship, ...placement } : placement;
  const length = Number(source.length ?? fallbackShip?.length);

  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('SHIP_LENGTH_INVALID');
  }

  return {
    id: source.shipId ?? source.id ?? fallbackShip?.id ?? `ship-${fallbackIndex + 1}`,
    name: source.name ?? fallbackShip?.name ?? source.id ?? `Ship ${fallbackIndex + 1}`,
    length,
    row: Number(source.row),
    col: Number(source.col),
    index: source.index,
    start: source.start,
    orientation: toOrientation(source.orientation ?? fallbackShip?.orientation ?? 'horizontal'),
  };
}

function isOccupiedCell(value) {
  if (OCCUPIED_VALUES.has(value)) {
    return true;
  }

  if (value && typeof value === 'object') {
    return Boolean(value.shipId ?? value.ship ?? value.occupied ?? value.hasShip);
  }

  return false;
}

function getSegmentCells(row, col, length, orientation, boardSize) {
  const cells = [];

  for (let offset = 0; offset < length; offset += 1) {
    const r = row + (orientation === 'vertical' ? offset : 0);
    const c = col + (orientation === 'horizontal' ? offset : 0);

    if (r >= boardSize || c >= boardSize) {
      return null;
    }

    cells.push(r * boardSize + c);
  }

  return cells;
}

function createSegmentCandidates(occupied, length, boardSize) {
  const candidates = [];

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      for (const orientation of ['horizontal', 'vertical']) {
        const cells = getSegmentCells(row, col, length, orientation, boardSize);

        if (cells && cells.every((cell) => occupied.has(cell))) {
          candidates.push({ row, col, orientation, cells });
        }
      }
    }
  }

  return candidates;
}

function cellsOverlap(a, b) {
  return a.some((cell) => b.has(cell));
}

function derivePlacementsFromBoard(board, fleet, boardSize) {
  if (!Array.isArray(board) || board.length !== boardSize * boardSize) {
    throw new Error('SHIP_BOARD_INVALID');
  }

  const occupied = new Set();

  board.forEach((value, index) => {
    if (isOccupiedCell(value)) {
      occupied.add(index);
    }
  });

  const expectedCells = fleet.reduce((sum, ship) => sum + ship.length, 0);

  if (occupied.size !== expectedCells) {
    throw new Error('SHIP_CELL_COUNT_MISMATCH');
  }

  const orderedFleet = fleet
    .map((ship, index) => ({ ...ship, originalIndex: index }))
    .sort((a, b) => b.length - a.length || a.originalIndex - b.originalIndex);
  const candidatesByLength = new Map();

  for (const ship of orderedFleet) {
    if (!candidatesByLength.has(ship.length)) {
      candidatesByLength.set(ship.length, createSegmentCandidates(occupied, ship.length, boardSize));
    }
  }

  function search(shipIndex, used, placements) {
    if (shipIndex >= orderedFleet.length) {
      return used.size === occupied.size ? placements : null;
    }

    const ship = orderedFleet[shipIndex];
    const candidates = candidatesByLength.get(ship.length) ?? [];

    for (const candidate of candidates) {
      if (cellsOverlap(candidate.cells, used)) {
        continue;
      }

      const nextUsed = new Set(used);
      candidate.cells.forEach((cell) => nextUsed.add(cell));

      const result = search(shipIndex + 1, nextUsed, [
        ...placements,
        {
          id: ship.id,
          name: ship.name,
          length: ship.length,
          row: candidate.row,
          col: candidate.col,
          orientation: candidate.orientation,
        },
      ]);

      if (result) {
        return result;
      }
    }

    return null;
  }

  const placements = search(0, new Set(), []);

  if (!placements) {
    throw new Error('SHIP_BOARD_CANNOT_BE_RECONSTRUCTED');
  }

  return placements.sort((a, b) => {
    const aIndex = fleet.findIndex((ship) => ship.id === a.id);
    const bIndex = fleet.findIndex((ship) => ship.id === b.id);
    return aIndex - bIndex;
  });
}

export function normalizeShipPlacements(payload, options = {}) {
  const fleet = options.fleet ?? DEFAULT_FLEET;
  const boardSize = options.boardSize ?? DEFAULT_BOARD_SIZE;
  const source = payload?.placements ?? payload?.ships ?? payload?.fleet ?? payload?.board ?? payload;

  if (Array.isArray(payload?.board)) {
    return derivePlacementsFromBoard(payload.board, fleet, boardSize);
  }

  if (Array.isArray(source) && source.length === boardSize * boardSize && !source.every((item) => item && typeof item === 'object' && 'length' in item)) {
    return derivePlacementsFromBoard(source, fleet, boardSize);
  }

  if (!Array.isArray(source)) {
    throw new Error('SHIP_PAYLOAD_INVALID');
  }

  return source.map((placement, index) => normalizePlacement(placement, fleet[index], index));
}
