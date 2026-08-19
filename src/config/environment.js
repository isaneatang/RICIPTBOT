/**
 * Environment configuration.
 *
 * Reads Vite env vars (import.meta.env) and merges them into the active
 * network configuration. All env reading happens here — components never
 * touch import.meta.env directly.
 *
 * VITE_* variables are PUBLIC (bundled into the browser). The deployment
 * private key is intentionally NOT a VITE_ variable, so it never reaches
 * client code.
 */
import { activeNetwork } from './chains.js';

const env = import.meta.env || {};

const isConfiguredValue = (value) =>
  !!value &&
  value !== 'YOUR_REOWN_PROJECT_ID' &&
  value !== 'YOUR_TESTNET_CONTRACT_ADDRESS' &&
  value !== 'YOUR_MAINNET_CONTRACT_ADDRESS';

export const environment = {
  // Reown / WalletConnect project id — public by design.
  reownProjectId: env.VITE_REOWN_PROJECT_ID || '',

  // The deployed contract address for whichever network is ACTIVE.
  contractAddress:
    activeNetwork.key === 'TN'
      ? env.VITE_TESTNET_CONTRACT_ADDRESS || ''
      : env.VITE_MAINNET_CONTRACT_ADDRESS || '',

  hasContract: isConfiguredValue(
    activeNetwork.key === 'TN' ? env.VITE_TESTNET_CONTRACT_ADDRESS : env.VITE_MAINNET_CONTRACT_ADDRESS
  ),

  // True once the Reown project id has actually been set (not the placeholder).
  hasReownProjectId: isConfiguredValue(env.VITE_REOWN_PROJECT_ID),

  // Public metadata used by AppKit/Reown for the WalletConnect session.
  appMetadata: {
    name: 'RICIPT',
    description: 'Turn a physical device purchase into a verifiable blockchain passport.',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://ricipt.app',
    icons: ['/assets/ricipt-mark.svg'],
  },
};

// Provide a placeholder value for the AppKit config when the project id has
// not been configured yet, but still surface a warning. AppKit requires a
// non-empty project id to initialize; a clearly-marked placeholder keeps the
// app bootable so the developer sees a proper "configure me" message instead
// of a white screen.
export const REOWN_PROJECT_ID = environment.reownProjectId || 'REOWN_PROJECT_ID_PLACEHOLDER';