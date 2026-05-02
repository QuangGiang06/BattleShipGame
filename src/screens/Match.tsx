import { useEffect, useMemo, useState } from "react";
import styles from "./Match.module.css";
import { CellState, GRID_SIZE, MatchStats, PlacedShip } from "@/game/types";
import { cellsForShip } from "@/game/grid";
import { useTacticalToast } from "@/components/Toast";

interface Props {
  myShips: PlacedShip[];
  onEnd: (stats: MatchStats) => void;
}

const COLS = "ABCDEFGHIJ".split("");

const randomEnemyFleet = (): PlacedShip[] => {
  // Lightweight random placement (demo).
  const lengths = [5, 4, 3, 3, 2];
  const placed: PlacedShip[] = [];
  for (let i = 0; i < lengths.length; i++) {
    let tries = 0;
    while (tries++ < 200) {
      const length = lengths[i];
      const orientation = Math.random() < 0.5 ? "H" : "V";
      const r = Math.floor(Math.random() * (orientation === "V" ? GRID_SIZE - length : GRID_SIZE));
      const c = Math.floor(Math.random() * (orientation === "H" ? GRID_SIZE - length : GRID_SIZE));
      const candidate: PlacedShip = {
        id: `e${i}`, name: "Enemy", length, row: r, col: c, orientation,
      };
      const occ = new Set(placed.flatMap((s) => cellsForShip(s).map(([rr, cc]) => `${rr},${cc}`)));
      const cells = cellsForShip(candidate);
      if (cells.every(([rr, cc]) => !occ.has(`${rr},${cc}`))) {
        placed.push(candidate);
        break;
      }
    }
  }
  return placed;
};

const Match = ({ myShips, onEnd }: Props) => {
  const [enemyShips] = useState<PlacedShip[]>(randomEnemyFleet);
  const [enemyState, setEnemyState] = useState<Map<string, CellState>>(new Map());
  const [myState, setMyState] = useState<Map<string, CellState>>(new Map());
  const [yourTurn, setYourTurn] = useState(true);
  const [targetingCell, setTargetingCell] = useState<string | null>(null);
  const [shots, setShots] = useState(0);
  const [hits, setHits] = useState(0);
  const toast = useTacticalToast();

  const myShipCells = useMemo(() => {
    const m = new Map<string, "ship">();
    myShips.forEach((s) => cellsForShip(s).forEach(([r, c]) => m.set(`${r},${c}`, "ship")));
    return m;
  }, [myShips]);

  const enemyShipCells = useMemo(() => {
    const m = new Set<string>();
    enemyShips.forEach((s) => cellsForShip(s).forEach(([r, c]) => m.add(`${r},${c}`)));
    return m;
  }, [enemyShips]);

  const totalEnemy = useMemo(
    () => enemyShips.reduce((a, s) => a + s.length, 0),
    [enemyShips]
  );
  const totalMine = useMemo(
    () => myShips.reduce((a, s) => a + s.length, 0),
    [myShips]
  );

  // Enemy AI turn
  useEffect(() => {
    if (yourTurn) return;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    t1 = setTimeout(() => {
      // pick random untargeted cell
      const tried = new Set(myState.keys());
      let r = 0, c = 0, key = "";
      do {
        r = Math.floor(Math.random() * GRID_SIZE);
        c = Math.floor(Math.random() * GRID_SIZE);
        key = `${r},${c}`;
      } while (tried.has(key));
      
      setTargetingCell(key);
      
      t2 = setTimeout(() => {
        const isHit = myShipCells.has(key);
        const next = new Map(myState);
        next.set(key, isHit ? "hit" : "miss");
        setMyState(next);
        setTargetingCell(null);
        if (isHit) toast.push("warning", "Incoming Hit", `Enemy struck ${COLS[c]}${r + 1}.`);
        setYourTurn(true);
      }, 800);
    }, 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [yourTurn, myState, myShipCells, toast]);

  // Win/loss check
  useEffect(() => {
    const myHits = Array.from(myState.values()).filter((v) => v === "hit").length;
    if (myHits >= totalMine) {
      onEnd({
        shotsFired: shots, hits, shipsRemaining: 0, outcome: "defeat",
      });
      return;
    }
    const enemyHits = Array.from(enemyState.values()).filter((v) => v === "hit").length;
    if (enemyHits >= totalEnemy) {
      const remaining = myShips.length - countSunk(myShips, myState);
      onEnd({
        shotsFired: shots, hits, shipsRemaining: remaining, outcome: "victory",
      });
    }
  }, [myState, enemyState, totalEnemy, totalMine, shots, hits, myShips, onEnd]);

  const fire = (r: number, c: number) => {
    if (!yourTurn) {
      toast.push("warning", "Not Your Turn", "Hold fire — awaiting enemy move.");
      return;
    }
    const key = `${r},${c}`;
    if (enemyState.has(key)) return;
    const isHit = enemyShipCells.has(key);
    const next = new Map(enemyState);
    next.set(key, isHit ? "hit" : "miss");
    setEnemyState(next);
    setShots((s) => s + 1);
    if (isHit) {
      setHits((h) => h + 1);
      toast.push("success", "Direct Hit", `Target ${COLS[c]}${r + 1} struck.`);
    }
    setYourTurn(false);
  };

  const renderGrid = (
    state: Map<string, CellState>,
    isEnemy: boolean,
    showShips: boolean,
  ) => (
    <div className={styles.grid}>
      <div className={styles.coord} />
      {COLS.map((c) => <div key={c} className={styles.coord}>{c}</div>)}
      {Array.from({ length: GRID_SIZE }).map((_, r) => (
        <>
          <div key={`row-${r}`} className={styles.coord}>{r + 1}</div>
          {Array.from({ length: GRID_SIZE }).map((_, c) => {
            const key = `${r},${c}`;
            const s = state.get(key);
            const showShip = showShips && (isEnemy ? false : myShipCells.has(key));
            const isTargeted = !isEnemy && key === targetingCell;
            const cls = [
              styles.cell,
              isEnemy && styles.enemyCell,
              isEnemy && state.has(key) && styles.fired,
              isEnemy && !yourTurn && styles.disabled,
              s === "miss" && styles.miss,
              s === "hit" && styles.hit,
              showShip && !s && styles.ship,
              isTargeted && styles.targeted,
            ].filter(Boolean).join(" ");
            return (
              <div
                key={key}
                className={cls}
                onClick={isEnemy ? () => fire(r, c) : undefined}
              />
            );
          })}
        </>
      ))}
    </div>
  );

  return (
    <div className={styles.root}>
      <div className={`${styles.turnBar} ${yourTurn ? styles.yourTurn : styles.enemyTurn}`}>
        <span className={styles.turnDot} />
        <span className={styles.turnText}>
          {yourTurn ? "Your Turn — Fire!" : "Enemy's Turn"}
        </span>
      </div>

      <div className={styles.boards}>
        <div className={`${styles.panel} ${styles.enemyPanel}`}>
          <div className={styles.head}>
            <h3 className={`${styles.title} ${styles.enemyTitle}`}>ENEMY WATERS</h3>
            <span className={styles.sub}>Targeting Grid</span>
          </div>
          <div className={styles.boardWrap}>{renderGrid(enemyState, true, false)}</div>
        </div>

        <div className={`${styles.panel} ${styles.myPanel}`}>
          <div className={styles.head}>
            <h3 className={`${styles.title} ${styles.myTitle}`}>MY FLEET</h3>
            <span className={styles.sub}>Defensive Grid</span>
          </div>
          <div className={styles.boardWrap}>{renderGrid(myState, false, true)}</div>
        </div>
      </div>

      <div className={styles.footer}>
        <div>Shots: {shots} · Hits: {hits} · Acc: {shots ? Math.round((hits / shots) * 100) : 0}%</div>
        <div className={styles.legend}>
          <div className={styles.legendItem}><span className={`${styles.lDot} ${styles.lShip}`} /> Ship</div>
          <div className={styles.legendItem}><span className={`${styles.lDot} ${styles.lHit}`} /> Hit</div>
          <div className={styles.legendItem}><span className={`${styles.lDot} ${styles.lMiss}`} /> Miss</div>
        </div>
      </div>
    </div>
  );
};

const countSunk = (ships: PlacedShip[], state: Map<string, CellState>) =>
  ships.filter((s) => cellsForShip(s).every(([r, c]) => state.get(`${r},${c}`) === "hit")).length;

export default Match;
