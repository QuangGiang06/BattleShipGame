import styles from './Endgame.module.css';

const REASON_TEXT = {
  disconnect: 'Đối thủ mất kết nối quá thời gian cho phép.',
  fleet_destroyed: 'Toàn bộ hạm đội của bên thua đã bị đánh chìm.',
  opponent_left: 'Một người chơi đã rời khỏi trận.',
  surrender: 'Trận đấu kết thúc do một người chơi đầu hàng.',
};

function Endgame({ winner, isMe, reason, rematchWaiting, onRematch, onQuit }) {
  return (
    <main className={styles.screen}>
      <section className={`${styles.card} ${isMe ? styles.victory : styles.defeat}`}>
        <div className={styles.ambientGlow} aria-hidden="true" />
        <div className={styles.topLine} aria-hidden="true" />

        <div className={styles.icon} aria-hidden="true">
          {isMe ? '🏆' : '⚓'}
        </div>

        <div className={styles.headingGroup}>
          <p className={styles.eyebrow}>Kết quả tác chiến</p>
          <h1>{isMe ? 'CHIẾN THẮNG!' : 'THẤT BẠI'}</h1>
        </div>

        <div className={styles.summary}>
          <p className={styles.primaryMessage}>
            {isMe
              ? `Chúc mừng ${winner}! Hạm đội đối phương đã bị tiêu diệt.`
              : `${winner} là người chiến thắng trận này.`}
          </p>
          <p className={styles.reason}>
            {REASON_TEXT[reason] ?? 'Trận đấu đã kết thúc.'}
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onRematch}
            disabled={rematchWaiting}
            className={styles.rematchButton}
          >
            {rematchWaiting ? 'Đang chờ đối thủ...' : 'Chơi lại'}
          </button>
          <button
            type="button"
            onClick={onQuit}
            className={styles.quitButton}
          >
            Rời phòng
          </button>
        </div>
      </section>
    </main>
  );
}

export default Endgame;
