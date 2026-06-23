import { useEffect, useRef } from 'react';

import styles from './ConfirmDialog.module.css';

function ConfirmDialog({
  open,
  tone = 'danger',
  eyebrow,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Quay lại',
  onConfirm,
  onCancel,
}) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  const isWarning = tone === 'warning';

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <section
        className={`${styles.dialog} ${isWarning ? styles.warning : styles.danger}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className={styles.scanLine} aria-hidden="true" />

        <div className={styles.icon} aria-hidden="true">
          {isWarning ? '⚑' : '⚠'}
        </div>

        <div className={styles.content}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p id="confirm-dialog-message">{message}</p>
        </div>

        <div className={styles.actions}>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={styles.confirmButton}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmDialog;
