export const ORIENTATION = Object.freeze({
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
});

export const DEFAULT_FLEET = Object.freeze([
  { id: 'carrier', name: 'Carrier', length: 5 },
  { id: 'battleship', name: 'Battleship', length: 4 },
  { id: 'cruiser', name: 'Cruiser', length: 3 },
  { id: 'submarine', name: 'Submarine', length: 3 },
  { id: 'destroyer', name: 'Destroyer', length: 2 },
]);

export function normalizeOrientation(orientation) {
  if (orientation === true || orientation === ORIENTATION.HORIZONTAL || orientation === 'h') {
    return ORIENTATION.HORIZONTAL;
  }

  if (orientation === false || orientation === ORIENTATION.VERTICAL || orientation === 'v') {
    return ORIENTATION.VERTICAL;
  }

  return null;
}

export function createShip(shipInput, fallbackIndex = 0) {
  const source = typeof shipInput === 'number' ? { length: shipInput } : shipInput;

  if (!source || !Number.isInteger(source.length) || source.length <= 0) {
    throw new Error('SHIP_LENGTH_INVALID');
  }

  return {
    id: source.id ?? `ship-${fallbackIndex + 1}`,
    name: source.name ?? source.id ?? `Ship ${fallbackIndex + 1}`,
    length: source.length,
    positions: [...(source.positions ?? [])],
    hits: [...(source.hits ?? [])],
  };
}

export function createFleet(fleet = DEFAULT_FLEET) {
  return fleet.map((ship, index) => createShip(ship, index));
}

export function applyHitToShip(ship, index) {
  if (!ship.positions.includes(index) || ship.hits.includes(index)) {
    return ship;
  }

  return {
    ...ship,
    hits: [...ship.hits, index],
  };
}

export function isShipSunk(ship) {
  return ship.positions.length > 0 && ship.positions.every((index) => ship.hits.includes(index));
}

export function areAllShipsSunk(ships) {
  return ships.length > 0 && ships.every(isShipSunk);
}
