/**
 * RICIPT entry point — Reown AppKit + Wagmi wiring.
 *
 * The exact flow (matches the current Reown AppKit docs, v1.8.x):
 *
 *   createAppKit({ adapters: [WagmiAdapter], networks: [...], projectId })
 *     ↕
 *   <WagmiProvider config={wagmiAdapter.wagmiConfig}>
 *     <QueryClientProvider client={queryClient}>
 *       <App/>
 *
 * Reown owns the wallet/session/connection infrastructure. RICIPT consumes
 * the resulting EIP-1193 provider through useAppKitProvider('eip155') and
 * does all blockchain interaction through viem/wagmi. We never hand-roll
 * WalletConnect and never assume window.ethereum exists.
 *
 * NOTE: only the ACTIVE network is registered with AppKit, which enforces
 * "ONE ACTIVE NETWORK AT A TIME" (see config/chains.js). Change
 * ACTIVE_NETWORK there to switch between TN and MN.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

import App from './App.jsx';
import { getAppKitNetworks } from './config/chains.js';
import { environment, REOWN_PROJECT_ID } from './config/environment.js';
import './styles/globals.css';
import './styles/components.css';
import './styles/pages.css';

// React Query cache for wagmi hooks.
const queryClient = new QueryClient();

// Reown requires a non-empty project id to boot. We ship a clearly-marked
// placeholder so the app still loads (and tells you what's wrong) before you
// configure yours. See .env.example.
const wagmiAdapter = new WagmiAdapter({
  networks: getAppKitNetworks(),
  projectId: REOWN_PROJECT_ID,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: getAppKitNetworks(),
  projectId: REOWN_PROJECT_ID,
  metadata: environment.appMetadata,
  themeMode: 'dark',
  features: {
    analytics: false, // keep the MVP quiet
    email: false, // no email/social login for the MVP
    socials: false,
    // Remove the wallet-menu money features (Fund / Buy / Swap / Send / Activity):
    // RICIPT is a passport tool, not a wallet.
    onramp: false, // "Buy crypto"
    receive: false, // "Receive / Fund wallet"
    swaps: false, // "Swap"
    send: false, // "Send"
    history: false, // "Activity"
  },
  themeVariables: {
    '--w3m-accent': '#c8f54a',
    '--w3m-color-mix': '#0a0e0a',
    '--w3m-color-mix-strength': 20,
  },
});

if (!environment.hasReownProjectId) {
  console.warn(
    '[RICIPT] VITE_REOWN_PROJECT_ID is not set. Copy .env.example to .env and add your Reown Project ID (https://dashboard.reown.com).'
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);