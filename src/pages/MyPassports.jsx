/**
 * MyPassports — the connected wallet's Device Passports.
 *
 * Ownership comes from the blockchain (authoritative), never from
 * localStorage. Discovery strategy (MVP): the contract keeps a per-owner
 * token list (passportsOfOwner) which we read directly. A future indexer can
 * replace this with zero frontend changes.
 *
 * Reads work without needing the wallet to be on the correct chain because
 * the read client talks to the active network RPC directly.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PassportCard from '../components/PassportCard.jsx';
import { useWallet } from '../hooks/useWallet.js';
import {
  readPassportsOfOwner,
  readOwnerOf,
  readStatus,
  hasContract,
} from '../blockchain/contract.js';
import { getPassportMetadata } from '../utils/storage.js';
import { shortAddress } from '../utils/formatting.js';
import { activeNetwork } from '../config/chains.js';
import { environment } from '../config/environment.js';

export default function MyPassports() {
  const { isConnected, address, connect } = useWallet();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isConnected || !address) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ids = await readPassportsOfOwner(address);
      const enriched = await Promise.all(
        ids.map(async (tokenId) => {
          try {
            const [owner, status] = await Promise.all([readOwnerOf(tokenId), readStatus(tokenId)]);
            return { tokenId, owner, status, meta: getPassportMetadata(tokenId) };
          } catch (err) {
            console.error('[RICIPT] Could not enrich passport', tokenId, err);
            return { tokenId, owner: null, status: null, meta: getPassportMetadata(tokenId) };
          }
        })
      );
      setItems(enriched);
    } catch (err) {
      console.error('[RICIPT] Failed to load passports:', err);
      setError('Could not read your passports from the blockchain.');
    } finally {
      setLoading(false);
    }
  }, [isConnected, address]);

  useEffect(() => {
    load();
  }, [load]);

  // --- Not connected --------------------------------------------------------
  if (!isConnected) {
    return (
      <div className="page">
        <div className="gate">
          <h2 className="gate__title">MY PASSPORTS</h2>
          <p className="gate__text">Connect your wallet to see the passports you own on BOT Chain.</p>
          <button type="button" className="btn btn--primary" onClick={connect}>
            CONNECT WALLET
          </button>
        </div>
      </div>
    );
  }

  // --- Contract not configured ----------------------------------------------
  if (!hasContract()) {
    return (
      <div className="page">
        <div className="gate">
          <h2 className="gate__title">CONTRACT NOT CONFIGURED</h2>
          <p className="gate__text">
            Set <code>{activeNetwork.key === 'TN' ? 'VITE_TESTNET_CONTRACT_ADDRESS' : 'VITE_MAINNET_CONTRACT_ADDRESS'}</code>{' '}
            in your <code>.env</code> after deploying the contract. See README.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">MY PASSPORTS</h1>
        <p className="page-sub mono">{shortAddress(address)}</p>
      </div>

      {loading && <p className="status-line">Loading passports from {activeNetwork.label}…</p>}
      {error && <p className="gate__error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="empty">
          <p className="empty__title">NO PASSPORTS YET</p>
          <p className="empty__text">
            Blockchain ownership is authoritative — this list comes straight from the contract, not
            from your browser.
          </p>
          <Link to="/create" className="btn btn--primary">
            CREATE YOUR FIRST PASSPORT
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="passport-grid">
          {items.map((item) => (
            <PassportCard
              key={item.tokenId}
              tokenId={item.tokenId}
              meta={item.meta}
              owner={item.owner}
              status={item.status}
            />
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <p className="page-footnote">
          {items.length} passport{items.length === 1 ? '' : 's'} owned on {activeNetwork.label}.
        </p>
      )}
    </div>
  );
}