/**
 * TransferModal — collect a recipient address and transfer a passport.
 *
 * Validates the address client-side (isAddress) before opening any wallet
 * request, so an invalid recipient never costs the user a wasted signature.
 * Uses the same tx state machine as mint (see usePassport).
 */
import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '../hooks/useWallet.js';
import { usePassport } from '../hooks/usePassport.js';
import { isValidEthereumAddress } from '../utils/validation.js';
import { shortAddress } from '../utils/formatting.js';
import TransactionStatus from './TransactionStatus.jsx';

export default function TransferModal({ open, tokenId, owner, onClose, onTransferred }) {
  const { address: connectedAddress, isConnected } = useWallet();
  const { transfer, tx, reset, isBusy } = usePassport();
  const [recipient, setRecipient] = useState('');
  const [touched, setTouched] = useState(false);

  // Reset modal-local state whenever it (re)opens.
  useEffect(() => {
    if (open) {
      setRecipient('');
      setTouched(false);
      reset();
    }
  }, [open, reset]);

  const validation = useMemo(() => {
    if (!recipient.trim()) return { valid: false, message: 'Enter a recipient address.' };
    if (!isValidEthereumAddress(recipient)) return { valid: false, message: 'That is not a valid wallet address.' };
    if (isConnected && recipient.toLowerCase() === connectedAddress?.toLowerCase()) {
      return { valid: false, message: 'The recipient is the same as the current owner.' };
    }
    return { valid: true };
  }, [recipient, connectedAddress, isConnected]);

  const handleConfirm = async () => {
    if (!validation.valid) {
      setTouched(true);
      return;
    }
    const result = await transfer({ to: recipient.trim(), tokenId });
    if (result !== null) {
      onTransferred?.(recipient.trim());
      onClose?.();
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={isBusy ? undefined : onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="transfer-title" className="modal__title">
          TRANSFER PASSPORT #{tokenId}
        </h2>
        <p className="modal__text">
          The passport will move from <span className="mono">{shortAddress(owner)}</span> to the
          recipient&apos;s wallet. On-chain ownership becomes authoritative immediately after
          confirmation.
        </p>

        <label className="field">
          <span className="field__label">RECIPIENT WALLET ADDRESS</span>
          <input
            className={`field__input mono${touched && !validation.valid ? ' field__input--error' : ''}`}
            type="text"
            value={recipient}
            onChange={(event) => {
              setRecipient(event.target.value);
              setTouched(true);
            }}
            placeholder="0x…"
            autoComplete="off"
            spellCheck="false"
            disabled={isBusy}
          />
          {touched && !validation.valid && (
            <span className="field__error">{validation.message}</span>
          )}
        </label>

        <TransactionStatus tx={tx} />

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isBusy}>
            CANCEL
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleConfirm}
            disabled={isBusy}
          >
            {isBusy ? 'TRANSFERRING…' : 'CONFIRM TRANSFER'}
          </button>
        </div>
      </div>
    </div>
  );
}