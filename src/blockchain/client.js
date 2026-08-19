/**
 * Blockchain clients (read + wallet) and low-level network helpers.
 *
 * Architecture (see README):
 *
 *   RICIPT → Reown AppKit → Wagmi / EIP-1193 provider → viem → BOT Chain
 *
 * Two client kinds, deliberately separated:
 *
 *   READ   : a viem publicClient talking directly to the active BOT Chain
 *            RPC. Works with NO wallet — public verification depends on this.
 *   WRITE  : a viem walletClient created on demand from the Reown EIP-1193
 *            provider (walletProvider). Requires wallet approval.
 *
 * The raw provider methods for chain management (switch / add) also live
 * here so WalletContext can orchestrate the WRONG_NETWORK → ADD → SWITCH
 * flow without scattering RPC calls through components.
 */
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { activeChain, activeNetwork } from '../config/chains.js';

const readClientCache = new Map();

/**
 * Get (and cache) the read-only viem client for the ACTIVE network.
 * Safe to call before any wallet exists.
 */
export function getReadClient() {
  if (!readClientCache.has(activeNetwork.key)) {
    readClientCache.set(
      activeNetwork.key,
      createPublicClient({
        chain: activeChain,
        transport: http(activeNetwork.rpcUrl),
      })
    );
  }
  return readClientCache.get(activeNetwork.key);
}

/**
 * Build a viem walletClient from the Reown EIP-1193 provider.
 * `account` is the connected address (string). Throws if the provider is
 * missing — callers must guard with useWallet().isConnected first.
 */
export function getWalletClient(provider, account) {
  if (!provider) throw new Error('No wallet provider available.');
  if (!account) throw new Error('No wallet account available.');
  return createWalletClient({
    account,
    chain: activeChain,
    transport: custom(provider),
  });
}

/**
 * Read the current chain id (as decimal number) from the wallet provider.
 * Uses eth_chainId on the raw provider so we trust the actual connected
 * chain, not any cached UI state.
 */
export async function getWalletChainId(provider) {
  const hex = await provider.request({ method: 'eth_chainId' });
  return Number.parseInt(String(hex), 16);
}

/**
 * Ask the wallet to switch to the active BOT Chain.
 * Returns true on success. Throws on failure; errors with code 4902
 * (chain unknown to the wallet) are re-thrown so callers know to call
 * addChainToWallet() next.
 */
export async function switchToActiveChain(provider) {
  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: `0x${activeNetwork.chainId.toString(16)}` }],
  });
  return true;
}

/**
 * Ask the wallet to ADD the active BOT Chain configuration.
 * Throws if the user rejects. After this succeeds, call
 * switchToActiveChain() again.
 */
export async function addActiveChainToWallet(provider) {
  await provider.request({
    method: 'wallet_addEthereumChain',
    params: [activeNetwork.walletAddParams],
  });
  return true;
}

/**
 * Full ensure-network flow for the ACTIVE network:
 *   1. read current chain
 *   2. if correct → { ok: true }
 *   3. if wrong → wallet_switchEthereumChain
 *   4. on 4902 → wallet_addEthereumChain, then switch again
 *
 * Returns { ok } and lets the caller map failures to friendly UI states.
 * The wallet session is NEVER touched on failure — disconnecting the wallet
 * just because a chain add was rejected would be hostile UX.
 */
export async function ensureActiveNetwork(provider) {
  const currentChainId = await getWalletChainId(provider);
  if (currentChainId === activeNetwork.chainId) {
    return { ok: true };
  }

  try {
    await switchToActiveChain(provider);
    return { ok: true };
  } catch (error) {
    const isUnknownChain =
      Number(error?.code) === 4902 ||
      /unrecognized chain|unsupported chain|chain not.*configured/i.test(
        [error?.message, error?.data?.message].filter(Boolean).join(' ')
      );

    if (!isUnknownChain) throw error;

    // Chain unknown → add it, then switch.
    await addActiveChainToWallet(provider);
    await switchToActiveChain(provider);
    return { ok: true };
  }
}