export const BOARD_SIZE = 10;

export const FLEET = Object.freeze([
  { id: 'carrier', name: 'Hàng không mẫu hạm', length: 5 },
  { id: 'battleship', name: 'Thiết giáp hạm', length: 4 },
  { id: 'cruiser', name: 'Tuần dương hạm', length: 3 },
  { id: 'submarine', name: 'Tàu ngầm', length: 3 },
  { id: 'destroyer', name: 'Khu trục hạm', length: 2 },
]);

export function createEmptyBoard() {
  return Array(BOARD_SIZE * BOARD_SIZE).fill(null);
}

export function getPlacementCells(startIndex, length, horizontal) {
  const row = Math.floor(startIndex / BOARD_SIZE);
  const col = startIndex % BOARD_SIZE;
  const cells = [];

  for (let offset = 0; offset < length; offset += 1) {
    const currentRow = row + (horizontal ? 0 : offset);
    const currentCol = col + (horizontal ? offset : 0);

    if (currentRow >= BOARD_SIZE || currentCol >= BOARD_SIZE) {
      return [];
    }

    cells.push(currentRow * BOARD_SIZE + currentCol);
  }

  return cells;
}

export function placeFleetShip(board, startIndex, ship, horizontal) {
  const cells = getPlacementCells(startIndex, ship.length, horizontal);

  if (cells.length !== ship.length || cells.some((index) => board[index] !== null)) {
    return null;
  }

  const nextBoard = [...board];
  cells.forEach((index) => {
    nextBoard[index] = 'S';
  });

  return {
    board: nextBoard,
    placement: {
      id: ship.id,
      name: ship.name,
      length: ship.length,
      row: Math.floor(startIndex / BOARD_SIZE),
      col: startIndex % BOARD_SIZE,
      orientation: horizontal ? 'horizontal' : 'vertical',
      cells,
    },
  };
}

export function rebuildBoard(placements) {
  const board = createEmptyBoard();
  placements.forEach((placement) => {
    placement.cells.forEach((index) => {
      board[index] = 'S';
    });
  });
  return board;
}

export function createRandomFleet() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    let board = createEmptyBoard();
    const placements = [];
    let valid = true;

    for (const ship of FLEET) {
      let placed = false;

      for (let shipAttempt = 0; shipAttempt < 200; shipAttempt += 1) {
        const horizontal = Math.random() >= 0.5;
        const startIndex = Math.floor(Math.random() * board.length);
        const result = placeFleetShip(board, startIndex, ship, horizontal);

        if (result) {
          board = result.board;
          placements.push(result.placement);
          placed = true;
          break;
        }
      }

      if (!placed) {
        valid = false;
        break;
      }
    }

    if (valid) {
      return { board, placements };
    }
  }

  throw new Error('RANDOM_FLEET_FAILED');
}

export function ownBoardFromGameView(gameView) {
  if (!gameView?.ownBoard) {
    return createEmptyBoard();
  }

  return gameView.ownBoard.map((cell) => {
    if (cell.state === 'hit' || cell.state === 'sunk') {
      return 'X';
    }
    if (cell.state === 'miss') {
      return 'O';
    }
    if (cell.state === 'ship') {
      return 'S';
    }
    return null;
  });
}

export function opponentBoardFromGameView(gameView) {
  const opponentBoard = Object.values(gameView?.opponentBoards ?? {})[0];

  if (!opponentBoard) {
    return createEmptyBoard();
  }

  return opponentBoard.map((cell) => {
    if (cell.state === 'hit') {
      return 'hit';
    }
    if (cell.state === 'sunk') {
      return 'sunk';
    }
    if (cell.state === 'miss') {
      return 'miss';
    }
    return null;
  });
}

export function fleetFromGameView(gameView) {
  const opponentShips = Object.values(gameView?.opponentShips ?? {})[0] ?? [];

  return {
    ownShips: (gameView?.ownShips ?? []).map((ship) => ({
      ...ship,
      positions: [...ship.positions],
      hits: [...ship.hits],
    })),
    opponentShips: opponentShips.map((ship) => ({
      ...ship,
      positions: [...ship.positions],
      hits: [...ship.hits],
    })),
  };
}

export function combatStatsFromGameView(gameView) {
  const shots = gameView?.shots ?? [];
  const hits = shots.filter((shot) => shot.result === 'hit' || shot.result === 'sunk').length;

  return {
    shots: shots.length,
    hits,
    accuracy: shots.length ? Math.round((hits / shots.length) * 100) : 0,
  };
}

export function createShipCellMap(ships = []) {
  const cells = new Map();

  ships.forEach((ship) => {
    if (!Array.isArray(ship.positions) || ship.positions.length === 0) {
      return;
    }

    const firstRow = Math.floor(ship.positions[0] / BOARD_SIZE);
    const orientation = ship.positions.every(
      (position) => Math.floor(position / BOARD_SIZE) === firstRow,
    )
      ? 'horizontal'
      : 'vertical';

    ship.positions.forEach((position, segmentIndex) => {
      cells.set(position, {
        ...ship,
        orientation,
        segmentIndex,
        isFirst: segmentIndex === 0,
        isLast: segmentIndex === ship.positions.length - 1,
        isHit: ship.hits.includes(position),
      });
    });
  });

  return cells;
}

export function coordinateLabel(index) {
  const column = String.fromCharCode(65 + (index % BOARD_SIZE));
  const row = Math.floor(index / BOARD_SIZE) + 1;
  return `${column}${row}`;
}
