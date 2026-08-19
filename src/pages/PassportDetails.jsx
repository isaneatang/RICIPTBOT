/**
 * PassportDetails — full on-chain record for one token, plus actions.
 *
 * Displays: token id, device info (from local display metadata when known),
 * status, issuer, owner, createdAt, data hash, contract address, explorer
 * links and a QR code pointing at the PUBLIC verify page.
 *
 * Actions: TRANSFER (modal), and UPDATE STATUS (owner/issuer/contract-owner
 * only — enforced on-chain). The status actions require the wallet to be
 * connected; viewing never does.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import PassportPreview from '../components/PassportPreview.jsx';
import QRCodeDisplay from '../components/QRCodeDisplay.jsx';
import TransferModal from '../components/TransferModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import TransactionStatus from '../components/TransactionStatus.jsx';
import { useWallet } from '../hooks/useWallet.js';
import { usePassport } from '../hooks/usePassport.js';
import {
  readPassport,
  readOwnerOf,
  readStatus,
  PASSPORT_STATUSES,
  PASSPORT_STATUS_LIST,
  hasContract,
} from '../blockchain/contract.js';
import { getPassportMetadata, addRecent } from '../utils/storage.js';
import { shortAddress, shortHash, formatFullTimestamp, explorerAddressUrl } from '../utils/formatting.js';
import { friendlyError } from '../utils/errors.js';
import { activeNetwork } from '../config/chains.js';
import { environment } from '../config/environment.js';

export default function PassportDetails() {
  const { tokenId } = useParams();
  const [searchParams] = useSearchParams();
  const { isConnected, address } = useWallet();
  const { updateStatus, tx, reset, isBusy } = usePassport();

  const [passport, setPassport] = useState(null);
  const [owner, setOwner] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const meta = useMemo(() => getPassportMetadata(tokenId), [tokenId]);

  const [showTransfer, setShowTransfer] = useState(Boolean(searchParams.get('transfer')));
  const [showStatusConfirm, setShowStatusConfirm] = useState(null); // status value being confirmed

  // Load the on-chain record (no wallet required).
  const load = useCallback(async () => {
    if (!tokenId || !hasContract()) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [p, o, s] = await Promise.all([
        readPassport(tokenId),
        readOwnerOf(tokenId),
        readStatus(tokenId),
      ]);
      if (!p) {
        setPassport(null);
        setLoadError('This passport does not exist on the active network.');
      } else {
        setPassport(p);
        setOwner(o);
        setStatus(s);
        addRecent(tokenId);
      }
    } catch (err) {
      console.error('[RICIPT] Failed to load passport:', err);
      setLoadError(friendlyError(err, { fallback: 'Could not read the passport from the blockchain.' }));
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    reset();
    load();
  }, [tokenId, load, reset]);

  const isOwner = isConnected && owner && address && owner.toLowerCase() === address.toLowerCase();
  const isIssuer = isConnected && passport && address && passport.issuer.toLowerCase() === address.toLowerCase();
  const canUpdateStatus = isOwner || isIssuer;

  const handleStatusConfirm = async () => {
    if (showStatusConfirm == null) return;
    const ok = await updateStatus({ tokenId, status: showStatusConfirm });
    if (ok != null) {
      setShowStatusConfirm(null);
      await load();
    }
  };

  const handleTransferred = async () => {
    await load();
  };

  if (loading) {
    return (
      <div className="page">
        <p className="status-line">Reading passport #{tokenId} from {activeNetwork.label}…</p>
      </div>
    );
  }

  if (loadError || !passport) {
    return (
      <div className="page">
        <div className="gate">
          <h2 className="gate__title">PASSPORT NOT FOUND</h2>
          <p className="gate__text">{loadError}</p>
          <div className="gate__actions">
            <Link to="/verify" className="btn btn--ghost">
              TRY PUBLIC VERIFICATION
            </Link>
            <Link to="/" className="btn btn--primary">
              HOME
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusLabel = PASSPORT_STATUSES[status] ?? 'UNKNOWN';
  const deviceName =
    meta?.manufacturer && meta?.model ? `${meta.manufacturer} ${meta.model}` : null;

  return (
    <div className="page">
      <div className="details">
        <div className="details__main">
          <div className="page-head">
            <h1 className="page-title">DEVICE PASSPORT #{tokenId}</h1>
            {deviceName && <p className="page-sub">{deviceName}</p>}
          </div>

          {meta && (
            <PassportPreview data={meta} footerNote="Local display data. Not stored on-chain by design." />
          )}

          <dl className="record">
            <div className="record__row">
              <dt>STATUS</dt>
              <dd>
                <span className={`status-badge status-badge--${statusLabel.toLowerCase()}`}>{statusLabel}</span>
              </dd>
            </div>
            <div className="record__row">
              <dt>ISSUER</dt>
              <dd className="mono">{passport.issuer ? shortAddress(passport.issuer) : '—'}</dd>
            </div>
            <div className="record__row">
              <dt>CURRENT OWNER</dt>
              <dd className="mono">{owner ? shortAddress(owner) : '—'}</dd>
            </div>
            <div className="record__row">
              <dt>CREATED</dt>
              <dd>{formatFullTimestamp(passport.createdAt)}</dd>
            </div>
            <div className="record__row">
              <dt>DATA HASH</dt>
              <dd className="mono" title={passport.dataHash}>
                {shortHash(passport.dataHash)}
              </dd>
            </div>
            <div className="record__row">
              <dt>CONTRACT</dt>
              <dd className="mono">{shortAddress(environment.contractAddress)}</dd>
            </div>
            <div className="record__row">
              <dt>NETWORK</dt>
              <dd>{activeNetwork.label}</dd>
            </div>
          </dl>

          <div className="details__actions">
            <button type="button" className="btn btn--primary" onClick={() => setShowTransfer(true)}>
              TRANSFER
            </button>
            <Link to={`/verify?tokenId=${tokenId}`} className="btn btn--ghost">
              VERIFY
            </Link>
            {canUpdateStatus && (
              <div className="details__status-update">
                <label className="field__label" htmlFor="status-select">
                  UPDATE STATUS (OWNER / ISSUER ONLY)
                </label>
                <div className="details__status-row">
                  <select
                    id="status-select"
                    className="field__input"
                    value=""
                    onChange={(event) => setShowStatusConfirm(Number(event.target.value))}
                    disabled={isBusy}
                  >
                    <option value="" disabled>
                      Change status…
                    </option>
                    {PASSPORT_STATUS_LIST.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <TransactionStatus tx={tx} />
        </div>

        <aside className="details__side">
          <QRCodeDisplay tokenId={tokenId} />
          <a
            className="btn btn--ghost btn--block"
            href={`${activeNetwork.explorerUrl}/token/${environment.contractAddress}?a=${tokenId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            VIEW ON EXPLORER
          </a>
          {owner && (
            <a
              className="btn btn--ghost btn--block"
              href={explorerAddressUrl(activeNetwork.explorerUrl, owner)}
              target="_blank"
              rel="noopener noreferrer"
            >
              VIEW OWNER
            </a>
          )}
        </aside>
      </div>

      <TransferModal
        open={showTransfer}
        tokenId={tokenId}
        owner={owner}
        onClose={() => setShowTransfer(false)}
        onTransferred={handleTransferred}
      />

      <ConfirmModal
        open={showStatusConfirm != null}
        title={`SET STATUS: ${PASSPORT_STATUSES[showStatusConfirm] ?? ''}`}
        message="This updates the passport's on-chain lifecycle status. The contract only allows the owner, issuer, or contract owner."
        confirmLabel="CONFIRM STATUS"
        danger={[1, 2].includes(showStatusConfirm)}
        busy={isBusy}
        onConfirm={handleStatusConfirm}
        onCancel={() => setShowStatusConfirm(null)}
      />
    </div>
  );
}