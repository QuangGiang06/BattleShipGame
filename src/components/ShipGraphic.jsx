import styles from './ShipGraphic.module.css';

function joinClasses(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function ShipSegment({ segment, opponent = false }) {
  const orientationClass = segment.orientation === 'horizontal'
    ? styles.horizontal
    : styles.vertical;
  const endClass = segment.isFirst
    ? styles.bow
    : segment.isLast
      ? styles.stern
      : styles.middle;
  const bridgeIndex = segment.id === 'carrier'
    ? Math.max(1, segment.length - 2)
    : Math.floor(segment.length / 2);
  const showBridge = segment.segmentIndex === bridgeIndex;
  const showWeapon = segment.id !== 'submarine'
    && segment.id !== 'carrier'
    && (segment.segmentIndex === 0 || segment.segmentIndex === segment.length - 1);
  const bridgeTypeClass = segment.id === 'carrier'
    ? styles.carrierIsland
    : segment.id === 'submarine'
      ? styles.conningTower
      : styles.commandTower;

  return (
    <span
      className={joinClasses(
        styles.segment,
        orientationClass,
        endClass,
        segment.sunk && styles.sunk,
        segment.isHit && styles.damaged,
        opponent && styles.enemy,
      )}
      data-ship-type={segment.id}
      aria-hidden="true"
    >
      <span className={styles.hullShade} />
      <span className={styles.deckLine} />
      <span className={styles.keelLine} />
      <span className={styles.porthole} />
      {segment.id === 'carrier' && <span className={styles.runway} />}
      {showBridge && (
        <span className={joinClasses(styles.bridge, bridgeTypeClass)}>
          <span className={styles.bridgeWindows} />
          <span className={styles.upperDeck} />
          <span className={styles.mast} />
        </span>
      )}
      {showWeapon && <span className={styles.gunTurret} />}
      {segment.sunk && <span className={styles.fire} />}
    </span>
  );
}

export function MiniShip({ ship, opponent = false }) {
  const hitCount = ship.hits?.length ?? 0;

  return (
    <span
      className={joinClasses(
        styles.miniShip,
        ship.sunk && styles.miniSunk,
        opponent && styles.miniEnemy,
      )}
      data-ship-type={ship.id}
      style={{ '--ship-length': ship.length }}
      aria-hidden="true"
    >
      <span className={styles.miniHull}>
        <span className={styles.miniDeckLine} />
        <span className={styles.miniBridge} />
        {ship.id === 'carrier' && <span className={styles.miniRunway} />}
        {ship.id === 'submarine' && <span className={styles.miniPeriscope} />}
      </span>
      <span className={styles.damageTrack}>
        {Array.from({ length: ship.length }, (_, index) => (
          <span
            key={index}
            className={joinClasses(
              styles.damageCell,
              (ship.sunk || (!opponent && index < hitCount)) && styles.damageCellHit,
            )}
          />
        ))}
      </span>
    </span>
  );
}
