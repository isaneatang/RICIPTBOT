/**
 * ConfirmModal — generic confirmation modal used for status updates and
 * destructive/authorized actions.
 *
 * Mobile-friendly: full-width on small screens, closes on backdrop/ESC, and
 * it never traps the network state behind it (nothing else in the modal).
 */
import { useEffect } from 'react';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'CONFIRM',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal modal--sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title" className="modal__title">
          {title}
        </h2>
        {message && <p className="modal__text">{message}</p>}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            CANCEL
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'PLEASE CONFIRM IN WALLET…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}