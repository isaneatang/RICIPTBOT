/**
 * Contract read/write layer.
 *
 * This is the ONLY file that knows the DevicePassport contract's address and
 * ABI at runtime. Pages call high-level functions like
 * `readPassport(tokenId)` or `mintPassport(...)` — they never construct
 * viem contracts themselves.
 *
 * Reads use the public read client (no wallet). Writes take a viem
 * walletClient + account from Reown.
 */
import { getContract } from 'viem';
import { getReadClient, getWalletClient } from './client.js';
import { DevicePassportABI } from './artifact.js';
import { activeNetwork } from '../config/chains.js';
import { environment } from '../config/environment.js';

/**
 * True if the active network has a configured contract address.
 */
export function hasContract() {
  return environment.hasContract;
}

/**
 * The active contract address (from env, per active network).
 * Returns null when not configured so callers can show a friendly message.
 */
export function getContractAddress() {
  return environment.hasContract ? environment.contractAddress : null;
}

/**
 * Return a viem contract instance bound to the read-only public client.
 * Throws a clear error if no contract is configured yet.
 */
export function getReadContract() {
  const address = getContractAddress();
  if (!address) throw new Error('CONTRACT_NOT_CONFIGURED');
  return getContract({
    address,
    abi: DevicePassportABI,
    client: getReadClient(),
  });
}

/**
 * Return a viem contract instance bound to a wallet client (writes).
 * `provider` is the Reown EIP-1193 provider; `account` the connected address.
 */
export function getWriteContract(provider, account) {
  const address = getContractAddress();
  if (!address) throw new Error('CONTRACT_NOT_CONFIGURED');
  return getContract({
    address,
    abi: DevicePassportABI,
    client: getWalletClient(provider, account),
  });
}

// ---------------------------------------------------------------------------
// READ FUNCTIONS (no wallet required)
// ---------------------------------------------------------------------------

/**
 * Read a passport's full on-chain record.
 * Returns { dataHash, metadataURI, issuer, createdAt, status } or null
 * when the token does not exist.
 */
export async function readPassport(tokenId) {
  if (!getContractAddress()) return null;
  try {
    const contract = getReadContract();
    const passport = await contract.read.getPassport([BigInt(tokenId)]);
    return {
      dataHash: passport[0],
      metadataURI: passport[1],
      issuer: passport[2],
      createdAt: Number(passport[3]),
      status: Number(passport[4]),
    };
  } catch (error) {
    // "token does not exist" (custom revert) OR an OZ NonexistentToken error
    // both mean "nothing here". Any RPC-level failure should bubble up as-is.
    const msg = [error?.message, error?.shortMessage].filter(Boolean).join(' ');
    if (/does not exist|nonexistent|NOEXISTENT|token.*does not exist/i.test(msg)) {
      return null;
    }
    throw error;
  }
}

export async function readOwnerOf(tokenId) {
  if (!getContractAddress()) return null;
  const contract = getReadContract();
  const owner = await contract.read.ownerOf([BigInt(tokenId)]);
  return owner;
}

export async function readStatus(tokenId) {
  if (!getContractAddress()) return null;
  const contract = getReadContract();
  const status = await contract.read.statusOf([BigInt(tokenId)]);
  return Number(status);
}

export async function readBalanceOf(address) {
  if (!getContractAddress()) return 0n;
  const contract = getReadContract();
  return contract.read.balanceOf([address]);
}

/**
 * Token ids owned by `address` on the ACTIVE network.
 * Backs "My Passports". Uses the on-chain per-owner list (see contract).
 */
export async function readPassportsOfOwner(address) {
  if (!getContractAddress()) return [];
  const contract = getReadContract();
  const ids = await contract.read.passportsOfOwner([address]);
  return ids.map((id) => Number(id));
}

// ---------------------------------------------------------------------------
// WRITE FUNCTIONS (wallet required)
// ---------------------------------------------------------------------------

/**
 * Mint a passport for the connected wallet.
 * @param provider Reown EIP-1193 provider
 * @param account connected address (issuer + initial owner)
 * @param dataHash 0x keccak256 of the canonical dataset
 * @returns { hash } the transaction hash
 */
export async function mintPassport(provider, account, { dataHash, metadataURI = '' }) {
  const contract = getWriteContract(provider, account);
  const hash = await contract.write.mint([dataHash, metadataURI]);
  return { hash };
}

/**
 * Transfer an ERC-721 passport. Standard transferFrom: only the owner (or an
 * approved operator) can do this, and the wallet enforces it.
 */
export async function transferPassport(provider, account, { from, to, tokenId }) {
  const contract = getWriteContract(provider, account);
  const hash = await contract.write.transferFrom([from, to, BigInt(tokenId)]);
  return { hash };
}

/**
 * Update a passport's status. Requires authorization (owner/issuer/current
 * owner — enforced by the contract).
 * `status` is a number 0-4 (see Status enum in the contract).
 */
export async function updatePassportStatus(provider, account, { tokenId, status }) {
  const contract = getWriteContract(provider, account);
  const hash = await contract.write.updateStatus([BigInt(tokenId), status]);
  return { hash };
}

/**
 * Lifecycle statuses, mirrored from the contract's Status enum.
 * Used by the UI for labels/badges. Keep in sync with contracts/DevicePassport.sol.
 */
export const PASSPORT_STATUSES = {
  0: 'VERIFIED',
  1: 'LOST',
  2: 'STOLEN',
  3: 'DISPUTED',
  4: 'RECOVERED',
};

export const PASSPORT_STATUS_LIST = Object.entries(PASSPORT_STATUSES).map(([value, label]) => ({
  value: Number(value),
  label,
}));

/**
 * Wait for a transaction to be mined on the ACTIVE network.
 * @returns { status, blockNumber } where status is 'success' | 'reverted'
 */
export async function waitForTransaction(txHash, { timeoutMs = 120000 } = {}) {
  const client = getReadClient();
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    timeout: timeoutMs,
  });
  return {
    status: receipt.status,
    blockNumber: Number(receipt.blockNumber),
    txHash,
  };
}