/**
 * BOT CHAIN MAINNET network configuration.
 *
 * Same rule as networks.testnet.js: every mainnet value lives here. Nothing
 * outside this file should mention chain 677.
 *
 * Values verified against the official BOT Chain developer docs:
 *   https://dev-docs.botchain.ai/docs/Developers/quick-guide
 *   https://dev-docs.botchain.ai/docs/Developers/json-rpc-endpoint
 */
import { defineChain } from 'viem';

export const botChainMainnet = defineChain({
  id: 677,
  name: 'BOT Chain',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.botchain.ai'] },
    public: { http: ['https://rpc.botchain.ai'] },
  },
  blockExplorers: {
    default: { name: 'BOTScan', url: 'https://scan.botchain.ai' },
  },
});

export const mainnetConfig = {
  key: 'MN',
  label: 'BOT MAINNET',
  chain: botChainMainnet,
  chainId: 677,
  chainName: 'BOT Chain',
  rpcUrl: 'https://rpc.botchain.ai',
  explorerUrl: 'https://scan.botchain.ai',
  currency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  walletAddParams: {
    chainId: '0x2a5', // 677 in hex
    chainName: 'BOT Chain',
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
    rpcUrls: ['https://rpc.botchain.ai'],
    blockExplorerUrls: ['https://scan.botchain.ai'],
  },
  // Filled from VITE_MAINNET_CONTRACT_ADDRESS in environment.js.
  contractAddress: '',
};