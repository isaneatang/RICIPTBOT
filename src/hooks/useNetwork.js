/**
 * useNetwork — active network facts + chain-management helpers for pages.
 *
 * This is a thin wrapper: network truth lives in config/chains.js and the
 * add/switch RPC logic lives in blockchain/client.js. Pages get a stable,
 * boring API and never import viem chain objects themselves.
 */
import { useWallet } from './useWallet.js';
import { activeNetwork, activeChain, getCaipNetworkId } from '../config/chains.js';

export function useNetwork() {
  const wallet = useWallet();

  return {
    // Static active-network facts (safe to read before connection).
    activeNetwork,
    activeChain,
    caipNetworkId: getCaipNetworkId(),
    isTestnet: activeNetwork.key === 'TN',

    // Live wallet-vs-network state from WalletContext.
    isConnected: wallet.isConnected,
    isOnActiveNetwork: wallet.isOnActiveNetwork,
    networkPhase: wallet.networkPhase,
    networkError: wallet.networkError,
    isEnsuring: wallet.isEnsuring,
    chainId: wallet.chainId,

    // Actions.
    ensureNetwork: wallet.ensureNetwork,
  };
}