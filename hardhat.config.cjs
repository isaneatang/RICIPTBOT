/**
 * Hardhat configuration for RICIPT.
 *
 * Two BOT Chain networks, values verified against the official dev docs
 * (https://dev-docs.botchain.ai/docs/Developers/quick-guide):
 *
 *   botChainTestnet  chainId 968  https://rpc.bohr.life
 *   botChainMainnet  chainId 677  https://rpc.botchain.ai
 *
 * The deployer private key comes EXCLUSIVELY from the DEPLOYER_PRIVATE_KEY
 * environment variable (see .env.example). It is NEVER committed and never
 * bundled into the frontend — VITE_* vars are public, this one is not.
 */
require('dotenv').config();
require('@nomicfoundation/hardhat-ethers');

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '';

const accounts = PRIVATE_KEY
  ? [PRIVATE_KEY]
  : { mnemonic: 'test test test test test test test test test test test junk' };

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    botChainTestnet: {
      url: 'https://rpc.bohr.life',
      chainId: 968,
      accounts,
    },
    botChainMainnet: {
      url: 'https://rpc.botchain.ai',
      chainId: 677,
      accounts,
    },
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
    cache: './cache',
  },
};