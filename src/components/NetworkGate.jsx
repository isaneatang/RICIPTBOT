/**
 * NetworkGate — wraps pages that need a wallet on the ACTIVE BOT Chain.
 *
 * It maps the wallet/network state to a friendly, non-blocking UI and only
 * renders `children` once the wallet is connected AND on the right chain.
 *
 * CRITICAL UX RULE: a wrong network / rejected network-add must NOT look like
 * a connection failure. Each phase gets its own message and a retry button;
 * the wallet session is never destroyed here.
 */
import { useWallet } from '../hooks/useWallet.js';
import { activeNetwork } from '../config/chains.js';
import { NETWORK_PHASES } from '../context/WalletContext.jsx';
import { environment } from '../config/environment.js';

export default function NetworkGate({ children, requireContract = true }) {
  const { isConnected, networkPhase, networkError, ensureNetwork, isEnsuring, connect } =
    useWallet();

  // --- Not connected -------------------------------------------------------
  if (!isConnected) {
    return (
      <div className="gate">
        <h2 className="gate__title">WALLET REQUIRED</h2>
        <p className="gate__text">
          Connect a wallet to continue. Your wallet session stays on your device — RICIPT never
          asks for your private key or seed phrase.
        </p>
        <button type="button" className="btn btn--primary" onClick={connect}>
          CONNECT WALLET
        </button>
      </div>
    );
  }

  // --- Contract not configured (per active network) -------------------------
  if (requireContract && !environment.hasContract) {
    return (
      <div className="gate">
        <h2 className="gate__title">CONTRACT NOT CONFIGURED</h2>
        <p className="gate__text">
          No contract address is set for <strong>{activeNetwork.label}</strong>. Add{' '}
          <code>
            {activeNetwork.key === 'TN'
              ? 'VITE_TESTNET_CONTRACT_ADDRESS'
              : 'VITE_MAINNET_CONTRACT_ADDRESS'}
          </code>{' '}
          to your <code>.env</code> after deploying the contract (see README → Deployment).
        </p>
        <p className="gate__text gate__text--muted">
          Public verification and read-only views will work as soon as the address is set.
        </p>
      </div>
    );
  }

  // --- READY ---------------------------------------------------------------
  if (networkPhase === NETWORK_PHASES.READY) {
    return children;
  }

  // --- Wrong network / adding / switching / rejected ------------------------
  const isUserRejected = networkPhase === NETWORK_PHASES.REJECTED;

  return (
    <div className="gate">
      <h2 className="gate__title">{isUserRejected ? 'NETWORK CHANGE CANCELLED' : 'BOT CHAIN REQUIRED'}</h2>

      {isUserRejected ? (
        <p className="gate__text">
          Network change cancelled. Your wallet is still connected. You can retry adding{' '}
          <strong>{activeNetwork.chainName}</strong> below.
        </p>
      ) : (
        <p className="gate__text">
          Your wallet is connected, but it is not on <strong>{activeNetwork.chainName}</strong> (chain
          ID {activeNetwork.chainId}). {activeNetwork.label} is the active RICIPT network.
        </p>
      )}

      {networkPhase === NETWORK_PHASES.ADDING && (
        <p className="gate__text">
          BOT Chain isn&apos;t configured in this wallet. Approve the network request to add{' '}
          <strong>{activeNetwork.chainName}</strong>, then RICIPT will switch to it automatically.
        </p>
      )}

      {networkPhase === NETWORK_PHASES.SWITCHING && (
        <p className="gate__text">Switching your wallet to {activeNetwork.chainName}…</p>
      )}

      {networkError && <p className="gate__error">{networkError}</p>}

      <button
        type="button"
        className="btn btn--primary"
        onClick={ensureNetwork}
        disabled={isEnsuring}
      >
        {isEnsuring
          ? 'UPDATING NETWORK…'
          : networkPhase === NETWORK_PHASES.ADDING
            ? 'ADD & SWITCH TO BOT CHAIN'
            : 'SWITCH TO BOT CHAIN'}
      </button>

      <p className="gate__text gate__text--muted">
        Prefer to do it manually? Add chain ID {activeNetwork.chainId} ({activeNetwork.rpcUrl}) in
        your wallet, then press the button above.
      </p>
    </div>
  );
}