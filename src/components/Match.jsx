import { useMemo } from 'react';

import {
  coordinateLabel,
  createShipCellMap,
  FLEET,
} from '../game/clientBoard';
import { MiniShip, ShipSegment } from './ShipGraphic';
import styles from './Match.module.css';

const COLUMNS = 'ABCDEFGHIJ'.split('');

function PersistentShotMarker({ state }) {
  if (state === 'miss' || state === 'O') {
    return (
      <span className={styles.missMarker} aria-hidden="true">
        <span />
      </span>
    );
  }

  if (state === 'hit' || state === 'sunk' || state === 'X') {
    return (
      <span className={`${styles.hitMarker} ${state === 'sunk' ? styles.sunkMarker : ''}`} aria-hidden="true">
        <span />
        <span />
      </span>
    );
  }

  return null;
}

function ShotEffect({ effect }) {
  if (!effect) {
    return null;
  }

  if (effect.phase === 'launch') {
    return (
      <span key={effect.id} className={styles.launchEffect} aria-hidden="true">
        <span className={styles.targetRing} />
        <span className={styles.targetRingInner} />
        <span className={styles.shell}>
          <span className={styles.shellTrail} />
        </span>
      </span>
    );
  }

  if (effect.phase === 'miss') {
    return (
      <span key={effect.id} className={styles.splashEffect} aria-hidden="true">
        <span className={styles.waterColumn} />
        <span className={styles.splashRing} />
        <span className={styles.splashRingSecond} />
        <span className={styles.dropletOne} />
        <span className={styles.dropletTwo} />
        <span className={styles.dropletThree} />
      </span>
    );
  }

  return (
    <span key={effect.id} className={`${styles.explosionEffect} ${effect.phase === 'sunk' ? styles.sunkExplosion : ''}`} aria-hidden="true">
      <span className={styles.explosionCore} />
      <span className={styles.explosionRing} />
      <span className={styles.smokeCloudOne} />
      <span className={styles.smokeCloudTwo} />
      <span className={styles.sparkOne} />
      <span className={styles.sparkTwo} />
      <span className={styles.sparkThree} />
      {effect.phase === 'sunk' && <span className={styles.destroyedLabel}>ĐÃ PHÁ HỦY</span>}
    </span>
  );
}

function FleetRoster({ ships, opponent = false }) {
  const fleet = FLEET.map((fleetShip) => (
    ships.find((ship) => ship.id === fleetShip.id)
    ?? { ...fleetShip, hits: [], positions: [], sunk: false }
  ));

  return (
    <div className={styles.fleetRoster}>
      {fleet.map((ship) => (
        <div
          key={ship.id}
          className={`${styles.fleetShip} ${ship.sunk ? styles.fleetShipSunk : ''}`}
          title={`${ship.name}: ${ship.sunk ? 'đã chìm' : opponent ? 'chưa bị đánh chìm' : `${ship.hits?.length ?? 0}/${ship.length} hư hại`}`}
        >
          <MiniShip ship={ship} opponent={opponent} />
          <span className={styles.fleetShipName}>{ship.name}</span>
        </div>
      ))}
    </div>
  );
}

function BoardGrid({
  board,
  ships,
  opponent = false,
  disabled = false,
  onAttack,
  battleFx,
}) {
  const shipCellMap = useMemo(() => createShipCellMap(ships), [ships]);

  return (
    <div className={`${styles.boardFrame} ${opponent ? styles.enemyBoardFrame : styles.ownBoardFrame}`}>
      <div className={styles.oceanSurface} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className={styles.boardGrid}>
        <span className={styles.coordinate} />
        {COLUMNS.map((column) => (
          <span key={column} className={styles.coordinate}>{column}</span>
        ))}

        {board.map((cell, index) => {
          const row = Math.floor(index / 10);
          const isFirstColumn = index % 10 === 0;
          const shipSegment = shipCellMap.get(index);
          const cellFx = battleFx?.board === (opponent ? 'opponent' : 'own')
            && battleFx.index === index
            ? battleFx
            : null;
          const stateClass = cell === 'fire'
            ? styles.cellFiring
            : cell === 'sunk'
              ? styles.cellSunk
              : cell === 'hit' || cell === 'X'
                ? styles.cellHit
                : cell === 'miss' || cell === 'O'
                  ? styles.cellMiss
                  : '';

          return (
            <div key={index} className="contents">
              {isFirstColumn && (
                <span className={styles.coordinate}>{row + 1}</span>
              )}
              <button
                type="button"
                onClick={opponent ? () => onAttack(index) : undefined}
                disabled={!opponent || disabled || Boolean(cell)}
                aria-label={`${opponent ? 'Bắn ô' : 'Ô'} ${coordinateLabel(index)}${cell ? `, ${cell}` : ''}`}
                title={coordinateLabel(index)}
                className={[
                  styles.boardCell,
                  opponent && styles.enemyCell,
                  disabled && styles.cellDisabled,
                  stateClass,
                  cellFx && styles.cellActiveFx,
                ].filter(Boolean).join(' ')}
              >
                <span className={styles.cellDepth} aria-hidden="true" />
                {shipSegment && <ShipSegment segment={shipSegment} opponent={opponent} />}
                <PersistentShotMarker state={cell} />
                <ShotEffect effect={cellFx} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Match({
  isMyTurn,
  gameMessage,
  myBoard,
  opponentBoard,
  myShips,
  opponentShips,
  combatStats,
  battleFx,
  shotPending,
  soundEnabled,
  onToggleSound,
  onAttack,
  onSurrender,
  onQuitMatch,
}) {
  const ownSunk = myShips.filter((ship) => ship.sunk).length;
  const enemySunk = opponentShips.filter((ship) => ship.sunk).length;
  const ownFx = battleFx?.board === 'own' ? battleFx : null;
  const opponentFx = battleFx?.board === 'opponent' ? battleFx : null;

  return (
    <div className={styles.matchShell}>
      <div className={styles.battleSky} aria-hidden="true" />

      <header className={`${styles.commandBar} ${isMyTurn ? styles.commandBarActive : ''}`}>
        <div>
          <span className={styles.eyebrow}>TRUNG TÂM CHỈ HUY HỎA LỰC</span>
          <h1 className={styles.statusMessage}>{gameMessage}</h1>
        </div>

        <div className={styles.commandActions}>
          <button
            type="button"
            onClick={onToggleSound}
            className={styles.soundButton}
            aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <div className={`${styles.turnBadge} ${isMyTurn ? styles.turnBadgeActive : ''}`}>
            <span />
            {shotPending ? 'ĐANG KHAI HỎA' : isMyTurn ? 'LƯỢT CỦA BẠN' : 'LƯỢT ĐỐI THỦ'}
          </div>
        </div>
      </header>

      <div className={styles.combatMetrics}>
        <div><span>LƯỢT BẮN</span><strong>{combatStats.shots}</strong></div>
        <div><span>TRÚNG ĐÍCH</span><strong>{combatStats.hits}</strong></div>
        <div><span>CHÍNH XÁC</span><strong>{combatStats.accuracy}%</strong></div>
        <div><span>ĐÃ HẠ</span><strong>{enemySunk}/5</strong></div>
        <div><span>TỔN THẤT</span><strong>{ownSunk}/5</strong></div>
      </div>

      <main className={styles.boards}>
        <section className={`${styles.boardPanel} ${styles.ownPanel} ${
          ownFx && ['hit', 'sunk'].includes(ownFx.phase) ? styles.panelImpact : ''
        }`}
        >
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelKicker}>KHU VỰC PHÒNG THỦ</span>
              <h2>HẠM ĐỘI CỦA TÔI</h2>
            </div>
            <span className={styles.fleetCounter}>{5 - ownSunk} TÀU HOẠT ĐỘNG</span>
          </div>
          <FleetRoster ships={myShips} />
          <BoardGrid
            board={myBoard}
            ships={myShips}
            battleFx={battleFx}
          />
        </section>

        <section className={`${styles.boardPanel} ${styles.enemyPanel} ${
          opponentFx && ['hit', 'sunk'].includes(opponentFx.phase) ? styles.panelImpact : ''
        }`}
        >
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelKicker}>KHU VỰC TẤN CÔNG</span>
              <h2>VÙNG BIỂN ĐỐI THỦ</h2>
            </div>
            <span className={`${styles.fleetCounter} ${styles.enemyFleetCounter}`}>
              {enemySunk} TÀU ĐÃ CHÌM
            </span>
          </div>
          <FleetRoster ships={opponentShips} opponent />
          <BoardGrid
            board={opponentBoard}
            ships={opponentShips}
            opponent
            disabled={!isMyTurn || shotPending}
            onAttack={onAttack}
            battleFx={battleFx}
          />
        </section>
      </main>

      <footer className={styles.actionBar}>
        <div className={styles.legend}>
          <span><i className={styles.legendShip} /> Tàu chiến</span>
          <span><i className={styles.legendHit} /> Bắn trúng</span>
          <span><i className={styles.legendMiss} /> Bắn trượt</span>
          <span><i className={styles.legendSunk} /> Đã chìm</span>
        </div>
        <div className={styles.actionButtons}>
          <button onClick={onSurrender} className={styles.surrenderButton}>Đầu hàng</button>
          <button onClick={onQuitMatch} className={styles.quitButton}>Thoát trận</button>
        </div>
      </footer>
    </div>
  );
}

export default Match;
