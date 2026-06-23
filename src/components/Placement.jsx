import { useMemo } from 'react';

import {
  coordinateLabel,
  createShipCellMap,
  FLEET,
} from '../game/clientBoard';
import { MiniShip, ShipSegment } from './ShipGraphic';
import styles from './Placement.module.css';

function Placement({
  myBoard,
  placements,
  currentShipIndex,
  isHorizontal,
  placementSubmitted,
  statusMessage,
  onCellClick,
  onToggleDirection,
  onUndo,
  onReset,
  onRandom,
  onReady,
}) {
  const isDone = currentShipIndex >= FLEET.length;
  const nextShip = FLEET[currentShipIndex];
  const placedShips = useMemo(
    () => placements.map((placement) => ({
      ...placement,
      positions: placement.cells,
      hits: [],
      sunk: false,
    })),
    [placements],
  );
  const shipCellMap = useMemo(() => createShipCellMap(placedShips), [placedShips]);

  return (
    <div className={`${styles.placementShell} flex flex-col items-center max-w-5xl mx-auto`}>
      <div className={`${styles.deploymentPanel} w-full p-5 sm:p-6 rounded-2xl border border-cyan-500/30 shadow-2xl mb-5 flex flex-col lg:flex-row justify-between items-center gap-5`}>
        <div className="text-center lg:text-left">
          <p className="text-[11px] font-bold text-cyan-300/70 uppercase tracking-[0.18em] mb-2">
            Giai đoạn triển khai
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 uppercase tracking-tight">
            Bố trí hạm đội
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {placementSubmitted ? statusMessage : 'Chọn vị trí trên hải đồ để triển khai đủ 5 tàu chiến.'}
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-3">
          <div className="text-center lg:text-right min-w-40">
            <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">
              Tàu đang triển khai
            </p>
            <p className="text-base sm:text-lg font-extrabold text-cyan-300">
              {isDone ? 'Đã hoàn tất đội hình' : `${nextShip.name} · ${nextShip.length} ô`}
            </p>
          </div>

          {!isDone && !placementSubmitted && (
            <button
              onClick={onToggleDirection}
              className="px-5 py-3 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
            >
              ↻ Xoay {isHorizontal ? 'ngang' : 'dọc'}
            </button>
          )}
        </div>
      </div>

      <div className={styles.fleetPreview}>
        {FLEET.map((ship, index) => (
          <div
            key={ship.id}
            className={[
              styles.fleetCard,
              index === currentShipIndex && !isDone ? styles.fleetCardActive : '',
              index < currentShipIndex ? styles.fleetCardPlaced : '',
            ].filter(Boolean).join(' ')}
            title={`${ship.name} · ${ship.length} ô`}
          >
            <MiniShip
              ship={{
                ...ship,
                hits: [],
                sunk: false,
              }}
            />
            <span className={styles.fleetCardName}>{ship.name}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-5">
        <button
          onClick={onUndo}
          disabled={currentShipIndex === 0 || placementSubmitted}
          className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-900/75 hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          Hoàn tác
        </button>
        <button
          onClick={onReset}
          disabled={currentShipIndex === 0 || placementSubmitted}
          className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-900/75 hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          Xếp lại
        </button>
        <button
          onClick={onRandom}
          disabled={placementSubmitted}
          className="px-4 py-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-40 transition-colors"
        >
          Xếp ngẫu nhiên
        </button>
      </div>

      <div className={styles.boardFrame}>
        <div className={styles.boardGrid}>
          {myBoard.map((cell, index) => {
            const segment = shipCellMap.get(index);

            return (
              <button
                type="button"
                key={index}
                onClick={() => onCellClick(index)}
                disabled={placementSubmitted || isDone}
                aria-label={`Ô ${coordinateLabel(index)}${cell === 'S' ? ', có tàu' : ''}`}
                title={coordinateLabel(index)}
                className={`${styles.boardCell} ${cell === 'S' ? styles.boardCellPlaced : ''}`}
              >
                {segment && <ShipSegment segment={segment} />}
              </button>
            );
          })}
        </div>
        <p className={styles.boardHint}>
          Tàu được hiển thị đúng hình dáng, hướng và kích thước ngay trên hải đồ.
        </p>
      </div>

      {isDone && (
        <button
          onClick={onReady}
          disabled={placementSubmitted}
          className="mt-7 px-10 sm:px-12 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-extrabold rounded-full shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-1 active:translate-y-0 uppercase tracking-wider text-sm sm:text-base"
        >
          {placementSubmitted ? 'Đang chờ đối thủ...' : 'Khóa đội hình'}
        </button>
      )}
    </div>
  );
}

export default Placement;
