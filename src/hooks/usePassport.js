/**
 * usePassport — transaction state machine + passport operations.
 *
 * Every write (mint / transfer / updateStatus) flows through a single state
 * machine so the UI can never appear frozen:
 *
 *   PREPARING → AWAITING_WALLET → SUBMITTED → CONFIRMING → CONFIRMED
 *                                                     ↘  FAILED
 *
 * During AWAITING_WALLET..CONFIRMING the calling component should disable its
 * submit button (isBusy below) to prevent duplicate transactions.
 */
import { useCallback, useRef, useState } from 'react';
import {
  mintPassport,
  transferPassport,
  updatePassportStatus,
  waitForTransaction,
  hasContract,
} from '../blockchain/contract.js';
import { friendlyError } from '../utils/errors.js';
import { savePassportMetadata } from '../utils/storage.js';
import { useWallet } from './useWallet.js';

export const TX_STATES = {
  IDLE: 'IDLE',
  PREPARING: 'PREPARING',
  AWAITING_WALLET: 'AWAITING_WALLET',
  SUBMITTED: 'SUBMITTED',
  CONFIRMING: 'CONFIRMING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
};

const TX_ORDER = [
  TX_STATES.IDLE,
  TX_STATES.PREPARING,
  TX_STATES.AWAITING_WALLET,
  TX_STATES.SUBMITTED,
  TX_STATES.CONFIRMING,
  TX_STATES.CONFIRMED,
  TX_STATES.FAILED,
];

/**
 * True when a transaction is in flight and submitting again must be blocked.
 */
export function txIsBusy(state) {
  return [TX_STATES.PREPARING, TX_STATES.AWAITING_WALLET, TX_STATES.SUBMITTED, TX_STATES.CONFIRMING].includes(state);
}

export function usePassport() {
  const { isConnected, provider, address, requireReady } = useWallet();

  const [tx, setTx] = useState({
    state: TX_STATES.IDLE,
    hash: null,
    error: null,
    result: null,
    operation: null, // which operation is running: 'mint' | 'transfer' | 'updateStatus'
  });
  const busyRef = useRef(false);

  const reset = useCallback(() => {
    busyRef.current = false;
    setTx({ state: TX_STATES.IDLE, hash: null, error: null, result: null, operation: null });
  }, []);

  /**
   * Run a write operation through the state machine.
   * `send` must be an async function that returns { hash } once the wallet
   * has signed (it throws on user rejection).
   * `onConfirmed` runs after the receipt is mined; its return value becomes
   * `tx.result`.
   */
  const runOperation = useCallback(
    async (operation, send, onConfirmed) => {
      if (busyRef.current) {
        console.warn('[RICIPT] Transaction already in flight — ignoring duplicate submit.');
        return null;
      }
      if (!requireReady()) return null;

      busyRef.current = true;
      setTx({ state: TX_STATES.PREPARING, hash: null, error: null, result: null, operation });

      try {
        // AWAITING_WALLET = wallet modal/signature prompt is open.
        setTx({ state: TX_STATES.AWAITING_WALLET, hash: null, error: null, result: null, operation });
        const { hash } = await send();

        setTx({ state: TX_STATES.SUBMITTED, hash, error: null, result: null, operation });
        setTx({ state: TX_STATES.CONFIRMING, hash, error: null, result: null, operation });

        const receipt = await waitForTransaction(hash);
        if (receipt.status !== 'success') {
          const error = 'The transaction was mined but reverted on-chain.';
          setTx({ state: TX_STATES.FAILED, hash, error, result: null, operation });
          busyRef.current = false;
          return null;
        }

        const result = onConfirmed ? await onConfirmed(hash) : null;
        setTx({ state: TX_STATES.CONFIRMED, hash, error: null, result, operation });
        busyRef.current = false;
        return result;
      } catch (error) {
        console.error('[RICIPT] Transaction failed:', error);
        setTx({ state: TX_STATES.FAILED, hash: null, error: friendlyError(error), result: null, operation });
        busyRef.current = false;
        return null;
      }
    },
    [requireReady]
  );

  /**
   * Mint a Device Passport.
   * @param dataHash keccak256 of the canonical dataset (see utils/hashing.js)
   * @param displayData safe display fields, persisted locally after mint so
   *        "My Passports" can show them without re-entering them.
   * @returns the minted tokenId or null on failure.
   */
  const mint = useCallback(
    async ({ dataHash, metadataURI = '', displayData }) => {
      if (!isConnected || !provider || !address) return null;
      const tokenId = await runOperation(
        'mint',
        () => mintPassport(provider, address, { dataHash, metadataURI }),
        () => {
          // After the receipt is mined, we still need the token id. The
          // contract mints sequentially (nextTokenId), so the new token is
          // the wallet's highest passport id. We prefer reading the mint
          // event, but event decoding adds complexity — for the MVP the
          // post-mint balance check below is deterministic and cheap.
          return readMintedTokenId(address);
        }
      );
      if (tokenId != null && displayData) {
        savePassportMetadata(tokenId, displayData);
      }
      return tokenId;
    },
    [isConnected, provider, address, runOperation]
  );

  /**
   * Transfer a passport to another wallet (standard ERC-721 transferFrom).
   */
  const transfer = useCallback(
    async ({ to, tokenId }) => {
      if (!isConnected || !provider || !address) return null;
      return runOperation(
        'transfer',
        () => transferPassport(provider, address, { from: address, to, tokenId }),
        null
      );
    },
    [isConnected, provider, address, runOperation]
  );

  /**
   * Update a passport's status (0-4). Authorization is enforced on-chain.
   */
  const updateStatus = useCallback(
    async ({ tokenId, status }) => {
      if (!isConnected || !provider || !address) return null;
      return runOperation(
        'updateStatus',
        () => updatePassportStatus(provider, address, { tokenId, status }),
        null
      );
    },
    [isConnected, provider, address, runOperation]
  );

  return {
    tx,
    mint,
    transfer,
    updateStatus,
    reset,
    isBusy: txIsBusy(tx.state),
    hasContract: hasContract(),
  };
}

/**
 * Determine the token id minted by the most recent mint transaction.
 * MVP strategy: read the wallet's passport list and return the highest id.
 * The contract mints sequentially, so the newest passport is the max id.
 * A future indexer / event parser can replace this.
 */
async function readMintedTokenId(address) {
  const { readPassportsOfOwner } = await import('../blockchain/contract.js');
  const ids = await readPassportsOfOwner(address);
  if (!ids.length) return null;
  return Math.max(...ids);
}

export { TX_ORDER };