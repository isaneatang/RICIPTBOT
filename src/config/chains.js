/**
 * Central ACTIVE NETWORK switch.
 *
 * This file is the single place that decides whether RICIPT talks to the
 * BOT Chain TESTNET or MAINNET. We deliberately keep this decision in one
 * place. Otherwise six months from now somebody will change chain 968 in one
 * file and leave another file happily talking to mainnet. Future-us does not
 * deserve that kind of betrayal.
 *
 *   ACTIVE_NETWORK = "TN"  => BOT Chain Testnet  (chainId 968)
 *   ACTIVE_NETWORK = "MN"  => BOT Chain Mainnet  (chainId 677)
 *
 * Changing this one line activates the other network everywhere: AppKit
 * chains, read/write clients, contract address, explorer links, everything.
 */
import { testnetConfig } from './networks.testnet.js';
import { mainnetConfig } from './networks.mainnet.js';

export const ACTIVE_NETWORK = 'TN'; // valid values: "TN" | "MN"

export const ACTIVE_NETWORKS = {
  TN: testnetConfig,
  MN: mainnetConfig,
};

if (!ACTIVE_NETWORKS[ACTIVE_NETWORK]) {
  // Fail loudly instead of silently running on an undefined network.
  throw new Error(`ACTIVE_NETWORK "${ACTIVE_NETWORK}" is invalid. Use "TN" or "MN".`);
}

export const activeNetwork = ACTIVE_NETWORKS[ACTIVE_NETWORK];

// The viem chain object for the active network — used by Reown AppKit/Wagmi.
export const activeChain = activeNetwork.chain;

// Convenience accessor so callers never need to know the switch keys.
export function getActiveNetwork() {
  return activeNetwork;
}

// CAIP-2 network id used by Reown, e.g. "eip155:968".
export function getCaipNetworkId() {
  return `eip155:${activeNetwork.chainId}`;
}

// Helper for the appkit networks array (AppKit needs the chain objects).
export function getAppKitNetworks() {
  return [activeChain];
}