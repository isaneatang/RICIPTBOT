/**
 * WalletContext — the single React interface to wallet + network state.
 *
 * RICIPT's philosophy (see README "Reown architecture"):
 *   Reown owns the wallet session. This context only *consumes* the Reown
 *   hooks (useAppKitAccount, useAppKitProvider, useAppKit, useDisconnect)
 *   and exposes a clean, stable API to pages:
 *
 *     { isConnected, address, status, provider, chainId, isOnActiveNetwork,
 *       networkPhase, connect, disconnect, ensureNetwork, error }
 *
 * Pages must NEVER touch Reown internals directly.
 *
 * Network states (deliberately separate from connection states — failing to
 * switch networks must NOT look like failing to connect):
 *
 *   IDLE          nothing checked yet
 *   CHECKING      verifying the wallet's chain
 *   READY         wallet is connected AND on the active BOT Chain
 *   WRONG_NETWORK wallet is connected but on another chain
 *   SWITCHING     requesting wallet_switchEthereumChain
 *   ADDING        chain unknown → requesting wallet_addEthereumChain
 *   REJECTED      user cancelled add/switch — wallet STAYS connected
 *   ERROR         a real error occurred (network/RPC problem)
 */
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppKit } from '@reown/appkit/react';
import { useAppKitAccount } from '@reown/appkit/react';
import { useAppKitProvider } from '@reown/appkit/react';
import { useAppKitNetwork } from '@reown/appkit/react';
import { useDisconnect } from '@reown/appkit/react';

import { activeNetwork, activeChain } from '../config/chains.js';
import {
  getWalletChainId,
  switchToActiveChain,
  addActiveChainToWallet,
} from '../blockchain/client.js';

const WalletContext = createContext(null);

// Phase labels shown in the UI / console for debugging.
export const NETWORK_PHASES = {
  IDLE: 'IDLE',
  CHECKING: 'CHECKING',
  READY: 'READY',
  WRONG_NETWORK: 'WRONG_NETWORK',
  SWITCHING: 'SWITCHING',
  ADDING: 'ADDING',
  REJECTED: 'REJECTED',
  ERROR: 'ERROR',
};

export function WalletProvider({ children }) {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { address, isConnected, status } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const appKitNetwork = useAppKitNetwork();

  const [chainId, setChainId] = useState(null);
  const [networkPhase, setNetworkPhase] = useState(NETWORK_PHASES.IDLE);
  const [networkError, setNetworkError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [isEnsuring, setIsEnsuring] = useState(false);

  // Guard against stale closures when walletProvider flips.
  const providerRef = useRef(walletProvider);
  providerRef.current = walletProvider;

  // Whenever we have a session + provider, read the authoritative chain.
  const refreshChainId = useCallback(async (provider) => {
    if (!provider) return null;
    try {
      const id = await getWalletChainId(provider);
      setChainId(id);
      return id;
    } catch (error) {
      console.error('[RICIPT] Could not read chain from wallet:', error);
      return null;
    }
  }, []);

  // Core network state derived from the connected chain.
  const isOnActiveNetwork = chainId !== null && Number(chainId) === activeNetwork.chainId;

  // Re-evaluate the network phase whenever connection/chain/provider changes.
  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      if (!isConnected || !walletProvider) {
        setNetworkPhase(NETWORK_PHASES.IDLE);
        setChainId(null);
        setNetworkError(null);
        return;
      }

      setNetworkPhase(NETWORK_PHASES.CHECKING);
      const id = await refreshChainId(walletProvider);
      if (cancelled) return;

      if (id === null) {
        setNetworkPhase(NETWORK_PHASES.ERROR);
        setNetworkError('Could not read the current network from your wallet.');
      } else if (Number(id) === activeNetwork.chainId) {
        setNetworkPhase(NETWORK_PHASES.READY);
      } else {
        setNetworkPhase(NETWORK_PHASES.WRONG_NETWORK);
      }
    };

    evaluate();
    return () => {
      cancelled = true;
    };
  }, [isConnected, walletProvider, refreshChainId]);

  /**
   * Open the Reown wallet picker. Normal Chrome with no extension works too:
   * AppKit offers WalletConnect QR / deep-link wallets in its own modal.
   */
  const connect = useCallback(() => {
    open();
  }, [open]);

  /**
   * Disconnect the wallet. After this the Reown session is dead and every
   * derived state resets automatically (no stale "connected" UI).
   */
  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('[RICIPT] Disconnect failed:', error);
    }
    setChainId(null);
    setNetworkPhase(NETWORK_PHASES.IDLE);
  }, [disconnect]);

  /**
   * Get the wallet onto the ACTIVE BOT Chain.
   *   wrong chain   → wallet_switchEthereumChain
   *   chain unknown → wallet_addEthereumChain, then switch
   *
   * On rejection we set REJECTED and LEAVE THE SESSION ALIVE. The wallet is
   * still connected; the user can retry. We never disconnect here.
   */
  const ensureNetwork = useCallback(async () => {
    const provider = providerRef.current;
    if (!isConnected || !provider) {
      setActionError('Connect your wallet first.');
      return { ok: false, reason: 'NOT_CONNECTED' };
    }

    setIsEnsuring(true);
    setActionError(null);
    setNetworkError(null);

    try {
      const currentId = await refreshChainId(provider);
      if (Number(currentId) === activeNetwork.chainId) {
        setNetworkPhase(NETWORK_PHASES.READY);
        return { ok: true };
      }

      setNetworkPhase(NETWORK_PHASES.SWITCHING);
      try {
        await switchToActiveChain(provider);
      } catch (switchError) {
        const isUnknownChain =
          Number(switchError?.code) === 4902 ||
          /unrecognized chain|unsupported chain|chain not.*configured/i.test(
            [switchError?.message, switchError?.data?.message].filter(Boolean).join(' ')
          );

        if (!isUnknownChain) throw switchError;

        setNetworkPhase(NETWORK_PHASES.ADDING);
        await addActiveChainToWallet(provider);
        setNetworkPhase(NETWORK_PHASES.SWITCHING);
        await switchToActiveChain(provider);
      }

      // Verify the switch actually landed on our chain before declaring READY.
      const finalId = await refreshChainId(provider);
      if (Number(finalId) === activeNetwork.chainId) {
        setNetworkPhase(NETWORK_PHASES.READY);
        return { ok: true };
      }
      setNetworkPhase(NETWORK_PHASES.WRONG_NETWORK);
      return { ok: false, reason: 'WRONG_NETWORK' };
    } catch (error) {
      console.error('[RICIPT] ensureNetwork failed:', error);
      const category = classifyEnsureError(error);
      if (category === 'USER_REJECTED') {
        // The wallet stays connected; the user can retry. Never disconnect.
        setNetworkPhase(NETWORK_PHASES.REJECTED);
        setNetworkError('Network change cancelled. Your wallet is still connected.');
      } else {
        // e.g. a WalletConnect wallet that does not support chain management.
        setNetworkPhase(NETWORK_PHASES.ERROR);
        setNetworkError(
          'Your wallet could not switch networks automatically. Add BOT Chain manually, then try again.'
        );
      }
      return { ok: false, reason: category };
    } finally {
      setIsEnsuring(false);
    }
  }, [isConnected, refreshChainId]);

  /**
   * Convenience guard for write operations: mint/transfer/status updates
   * must only run while the wallet is READY on the active chain.
   * Returns true when safe to proceed; otherwise sets a friendly error.
   */
  const requireReady = useCallback(() => {
    if (!isConnected) {
      setActionError('Connect your wallet first.');
      return false;
    }
    if (networkPhase === NETWORK_PHASES.REJECTED || networkPhase === NETWORK_PHASES.WRONG_NETWORK) {
      setActionError('Your wallet is connected, but BOT Chain is not active.');
      return false;
    }
    if (networkPhase !== NETWORK_PHASES.READY) {
      setActionError('Waiting for the network check. Please retry in a moment.');
      return false;
    }
    return true;
  }, [isConnected, networkPhase]);

  const clearError = useCallback(() => {
    setActionError(null);
    setNetworkError(null);
  }, []);

  const value = useMemo(
    () => ({
      // Connection state (authoritative — straight from Reown).
      isConnected,
      address,
      status,
      provider: walletProvider,
      connect,
      disconnect: disconnectWallet,

      // Network state.
      activeNetwork,
      activeChain,
      chainId,
      isOnActiveNetwork,
      networkPhase,
      networkError,
      isEnsuring,
      appKitNetworkId: appKitNetwork?.chainId ?? null,

      // Actions + errors.
      ensureNetwork,
      requireReady,
      actionError,
      setActionError,
      clearError,
    }),
    [
      isConnected,
      address,
      status,
      walletProvider,
      connect,
      disconnectWallet,
      activeNetwork,
      activeChain,
      chainId,
      isOnActiveNetwork,
      networkPhase,
      networkError,
      isEnsuring,
      appKitNetwork?.chainId,
      ensureNetwork,
      requireReady,
      actionError,
      clearError,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

function classifyEnsureError(error) {
  const code = Number(error?.code);
  if (code === 4001) return 'USER_REJECTED';
  const msg = [
    error?.shortMessage,
    error?.message,
    error?.data?.message,
    typeof error === 'string' ? error : null,
  ]
    .filter(Boolean)
    .join(' ');
  if (/user rejected|denied|rejected|cancelled|canceled/i.test(msg)) return 'USER_REJECTED';
  return 'ERROR';
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used inside <WalletProvider>.');
  }
  return ctx;
}

// Re-export so hooks/useWallet.js is a thin, conventional alias.
export default WalletContext;