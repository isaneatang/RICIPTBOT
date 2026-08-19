/**
 * VerifyPassport — PUBLIC verification. Works WITHOUT a wallet.
 *
 * Route: /verify?tokenId=123
 *
 * It queries the active BOT Chain via the read-only client and shows exactly
 * what is on-chain: token id, status, issuer, owner, contract, data hash.
 * Optionally, if this browser knows the local display metadata for the token
 * (e.g. it minted it here), that is shown CLEARLY LABELED as local data.
 *
 * HONESTY: we distinguish "passport exists on-chain" from "all claims about
 * this device are independently verified". Those are not the same thing.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  readPassport,
  readOwnerOf,
  readStatus,
  PASSPORT_STATUSES,
  hasContract,
} from '../blockchain/contract.js';
import { getPassportMetadata } from '../utils/storage.js';
import { shortAddress, shortHash, formatFullTimestamp, explorerAddressUrl } from '../utils/formatting.js';
import { friendlyError } from '../utils/errors.js';
import { activeNetwork } from '../config/chains.js';
import { environment } from '../config/environment.js';
import { isValidTokenId } from '../utils/validation.js';

export default function VerifyPassport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTokenId = searchParams.get('tokenId') || '';

  const [tokenId, setTokenId] = useState(isValidTokenId(rawTokenId) ? rawTokenId : '');
  const [input, setInput] = useState(rawTokenId);
  const [passport, setPassport] = useState(null);
  const [owner, setOwner] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checked, setChecked] = useState(false);

  const runVerify = useCallback(async () => {
    if (!tokenId || !hasContract()) return;
    setLoading(true);
    setError(null);
    setPassport(null);
    setChecked(false);
    try {
      const [p, o, s] = await Promise.all([
        readPassport(tokenId),
        readOwnerOf(tokenId),
        readStatus(tokenId),
      ]);
      if (!p) {
        setError('This passport does not exist on the active network.');
      } else {
        setPassport(p);
        setOwner(o);
        setStatus(s);
      }
    } catch (err) {
      console.error('[RICIPT] Verify failed:', err);
      setError(friendlyError(err, { fallback: 'Could not read the passport from the blockchain.' }));
    } finally {
      setLoading(false);
      setChecked(true);
    }
  }, [tokenId]);

  useEffect(() => {
    if (isValidTokenId(rawTokenId)) {
      setTokenId(rawTokenId);
      setInput(rawTokenId);
      runVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTokenId]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isValidTokenId(input)) {
      setError('Enter a valid token id.');
      setChecked(true);
      return;
    }
    setTokenId(input);
    setSearchParams({ tokenId: input }, { replace: true });
    runVerify();
  };

  const meta = tokenId ? getPassportMetadata(tokenId) : null;

  return (
    <div className="page">
      <div className="verify">
        <div className="verify__head">
          <h1 className="page-title">PUBLIC PASSPORT VERIFICATION</h1>
          <p className="page-sub">
            No wallet required. Reads the {activeNetwork.label} blockchain directly.
          </p>
        </div>

        <form className="verify__form" onSubmit={handleSubmit}>
          <input
            className="field__input mono"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Enter token id, e.g. 12"
            inputMode="numeric"
            autoComplete="off"
          />
          <button type="submit" className="btn btn--primary">
            {loading ? 'CHECKING…' : 'VERIFY'}
          </button>
        </form>

        {!hasContract() && (
          <div className="gate">
            <h2 className="gate__title">CONTRACT NOT CONFIGURED</h2>
            <p className="gate__text">
              Set <code>VITE_TESTNET_CONTRACT_ADDRESS</code> or{' '}
              <code>VITE_MAINNET_CONTRACT_ADDRESS</code> in <code>.env</code> after deploying.
            </p>
          </div>
        )}

        {loading && <p className="status-line">Checking the blockchain…</p>}

        {error && (
          <div className="verify__result verify__result--error">
            <p className="verify__result-title">✕ NOT FOUND</p>
            <p>{error}</p>
            <p className="verify__result-note">
              {`"Passport does not exist" is a blockchain answer. It means no passport was minted
              for this token id on ${activeNetwork.label}. It does not mean the device itself is
              fake.`}
            </p>
          </div>
        )}

        {passport && !error && (
          <div className="verify__result">
            <p className="verify__result-title">✓ PASSPORT EXISTS ON-CHAIN</p>

            <dl className="record">
              <div className="record__row">
                <dt>TOKEN ID</dt>
                <dd className="mono">{tokenId}</dd>
              </div>
              <div className="record__row">
                <dt>STATUS</dt>
                <dd>
                  <span className={`status-badge status-badge--${(PASSPORT_STATUSES[status] ?? 'UNKNOWN').toLowerCase()}`}>
                    {PASSPORT_STATUSES[status] ?? 'UNKNOWN'}
                  </span>
                </dd>
              </div>
              <div className="record__row">
                <dt>ISSUER</dt>
                <dd className="mono">{passport.issuer ? shortAddress(passport.issuer) : ''}</dd>
              </div>
              <div className="record__row">
                <dt>CURRENT OWNER</dt>
                <dd className="mono">{owner ? shortAddress(owner) : ''}</dd>
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

            {meta && (
              <div className="verify__local">
                <p className="verify__local-title">LOCAL DISPLAY DATA (THIS BROWSER ONLY)</p>
                <p className="verify__local-text">
                  This device was minted or viewed in this browser. It is NOT part of the on-chain
                  record and is not a blockchain-backed claim.
                </p>
                <ul className="verify__local-list">
                  <li>
                    <span>Device</span>
                    <span>
                      {meta.manufacturer} {meta.model}
                    </span>
                  </li>
                  <li>
                    <span>Type</span>
                    <span>{meta.deviceType}</span>
                  </li>
                  <li>
                    <span>Purchase date</span>
                    <span>{meta.purchaseDate}</span>
                  </li>
                  <li>
                    <span>Retailer</span>
                    <span>{meta.retailer}</span>
                  </li>
                </ul>
              </div>
            )}

            <div className="verify__links">
              {owner && (
                <a
                  className="btn btn--ghost"
                  href={explorerAddressUrl(activeNetwork.explorerUrl, owner)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  VIEW OWNER ON EXPLORER
                </a>
              )}
              <Link to={`/passport/${tokenId}`} className="btn btn--ghost">
                PASSPORT DETAILS
              </Link>
            </div>

            <div className="verify__disclaimer">
              <strong>BLOCKCHAIN PROOF OF RECORD ≠ REAL-WORLD TRUTH.</strong> This confirms a
              passport was minted on-chain with this data hash, by this issuer, currently owned by
              this wallet. It does NOT independently verify that the purchase, retailer, or device
              are legitimate, nor that the NFT owner legally owns the physical device.
            </div>
          </div>
        )}

        {checked && !loading && !error && !passport && hasContract() && (
          <p className="verify__empty">
            Enter a token id above to check a passport.
          </p>
        )}
      </div>
    </div>
  );
}