/**
 * BOT CHAIN TESTNET network configuration.
 *
 * Everything the app knows about the testnet lives here so that chain IDs,
 * RPC URLs and explorers are NEVER scattered through components. If you see
 * the number 968 in a component, that is a bug.
 *
 * Values verified against the official BOT Chain developer docs:
 *   https://dev-docs.botchain.ai/docs/Developers/quick-guide
 *   https://dev-docs.botchain.ai/docs/Developers/json-rpc-endpoint
 */
import { defineChain } from 'viem';

export const botChainTestnet = defineChain({
  id: 968,
  name: 'BOT Chain Testnet',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.bohr.life'] },
    public: { http: ['https://rpc.bohr.life'] },
  },
  blockExplorers: {
    default: { name: 'BOTScan', url: 'https://scan.bohr.life' },
  },
});

export const testnetConfig = {
  // `key` matches the ACTIVE_NETWORK switch in chains.js ("TN").
  key: 'TN',
  label: 'BOT TESTNET',
  chain: botChainTestnet,
  chainId: 968,
  chainName: 'BOT Chain Testnet',
  rpcUrl: 'https://rpc.bohr.life',
  explorerUrl: 'https://scan.bohr.life',
  currency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  // The faucet is here purely for documentation / UI hints. The app itself
  // does not call it.
  faucetUrl: 'https://faucet.botchain.ai/basic',
  // Public chain configuration used by wallet_addEthereumChain.
  walletAddParams: {
    chainId: '0x3c8', // 968 in hex
    chainName: 'BOT Chain Testnet',
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
    rpcUrls: ['https://rpc.bohr.life'],
    blockExplorerUrls: ['https://scan.bohr.life'],
  },
  // Filled from VITE_TESTNET_CONTRACT_ADDRESS in environment.js.
  // Keep it out of this file so env-based configuration stays in one place.
  contractAddress: '',
};