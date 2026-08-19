/**
 * PassportCard — summary card for one passport (My Passports page).
 *
 * Shows: token id, device name (from local display metadata or a fallback),
 * status badge, owner, and VIEW / TRANSFER actions.
 */
import { Link } from 'react-router-dom';
import { PASSPORT_STATUSES } from '../blockchain/contract.js';
import { shortAddress } from '../utils/formatting.js';

export default function PassportCard({ tokenId, meta, owner, status }) {
  const deviceName = meta?.manufacturer && meta?.model
    ? `${meta.manufacturer} ${meta.model}`
    : 'Device Passport';
  const statusLabel = PASSPORT_STATUSES[status] ?? 'UNKNOWN';

  return (
    <article className="passport-card">
      <div className="passport-card__header">
        <span className="passport-card__title">RICIPT DEVICE PASSPORT</span>
        <span className="passport-card__token">#{tokenId}</span>
      </div>

      <h3 className="passport-card__device">{deviceName}</h3>

      <dl className="passport-card__meta">
        <div>
          <dt>STATUS</dt>
          <dd>
            <span className={`status-badge status-badge--${statusLabel.toLowerCase()}`}>
              {statusLabel}
            </span>
          </dd>
        </div>
        <div>
          <dt>OWNER</dt>
          <dd className="mono">{owner ? shortAddress(owner) : '—'}</dd>
        </div>
      </dl>

      <div className="passport-card__actions">
        <Link to={`/passport/${tokenId}`} className="btn btn--ghost">
          VIEW
        </Link>
        <Link to={`/passport/${tokenId}?transfer=1`} className="btn btn--primary">
          TRANSFER
        </Link>
      </div>
    </article>
  );
}