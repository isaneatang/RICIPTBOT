/**
 * WalletButton — the single "CONNECT WALLET" entry point.
 *
 * Reown owns the wallet picker; this button just asks WalletContext to open
 * it (useWallet().connect). We deliberately do NOT try to sniff
 * window.ethereum or build a competing wallet system. Normal Chrome without
 * an extension still works because AppKit offers QR / deep-link wallets.
 */
import { useWallet } from '../hooks/useWallet.js';
import { shortAddress } from '../utils/formatting.js';

export default function WalletButton({ size = 'normal' }) {
  const { isConnected, address, connect, disconnect } = useWallet();

  if (!isConnected) {
    return (
      <button type="button" className={`btn btn--primary ${size === 'large' ? 'btn--lg' : ''}`} onClick={connect}>
        CONNECT WALLET
      </button>
    );
  }

  return (
    <div className="wallet-chip">
      <button
        type="button"
        className="wallet-chip__address"
        onClick={connect}
        title="Manage wallet"
      >
        {shortAddress(address)}
      </button>
      <button
        type="button"
        className="wallet-chip__disconnect"
        onClick={disconnect}
        title="Disconnect wallet"
        aria-label="Disconnect wallet"
      >
        ✕
      </button>
    </div>
  );
}