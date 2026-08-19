/**
 * Centralized error mapping.
 *
 * Every raw error that bubbles up from wagmi/viem/Reown/wallets is passed
 * through friendlyError() before it can reach the UI. The UI never renders
 * raw provider messages — they are frequently long, technical, and confusing
 * ("-32603: Internal JSON-RPC error") or contain stack traces.
 *
 * We still `console.error` the raw error so debugging stays possible.
 */
import { isAddress as viemIsAddress } from 'viem';

const CODE_USER_REJECTED = 4001;
const CODE_ALREADY_PROCESSING = -32002;
const CODE_CHAIN_NOT_CONFIGURED = 4902;
const CODE_ACTION_REJECTED = -32603; // wallet-level generic "rejected" fallback

// Substring matching is ugly but necessary: wallets do not share an error
// vocabulary, so we match on the common bits they DO share.
const SUBSTRINGS = [
  { pattern: /user rejected|denied transaction|request rejected|action rejected|cancelled by user|canceled by user/i, category: 'USER_REJECTED' },
  { pattern: /user denied message/i, category: 'USER_REJECTED' },
  { pattern: /insufficient funds|insufficient balance|not enough .* for gas|exceeds the configured gas/i, category: 'INSUFFICIENT_FUNDS' },
  { pattern: /unrecognized chain|unsupported chain|chain not.*configured|is not configured in this wallet/i, category: 'CHAIN_NOT_CONFIGURED' },
  { pattern: /execution reverted|transaction reverted|revert/i, category: 'CONTRACT_REVERT' },
  { pattern: /already processing|request already pending|pending request/i, category: 'ALREADY_PROCESSING' },
  { pattern: /network error|fetch failed|enetunreach|econnreset|econnrefused|timeout.*rpc|rate limit|too many requests/i, category: 'RPC_FAILURE' },
  { pattern: /session.*expired|expired.*session|connection.*expired/i, category: 'SESSION_EXPIRED' },
  { pattern: /disconnected|no active session|session.*ended|wallet disconnected/i, category: 'SESSION_ENDED' },
  { pattern: /modal.*closed|user closed|connection request reset|closed the modal/i, category: 'USER_CLOSED_MODAL' },
  { pattern: /invalid address|not a valid address|invalid.*recipient/i, category: 'INVALID_ADDRESS' },
  { pattern: /insufficient allowance|allowance/i, category: 'ALLOWANCE' },
  { pattern: /nonce too low|nonce.*(low|used)/i, category: 'NONCE' },
];

// Friendly messages keyed by category.
const MESSAGES = {
  USER_REJECTED: 'Transaction cancelled or rejected in your wallet.',
  INSUFFICIENT_FUNDS: 'Not enough BOT to complete this transaction.',
  CHAIN_NOT_CONFIGURED: "BOT Chain isn't configured in this wallet. Add BOT Chain to continue.",
  CONTRACT_REVERT: 'The contract rejected this operation. Check the details and try again.',
  ALREADY_PROCESSING: 'Your wallet is already showing a request. Approve or dismiss it first.',
  RPC_FAILURE: 'Could not reach the BOT Chain network. Check your connection and try again.',
  SESSION_EXPIRED: 'Your wallet session expired. Please reconnect.',
  SESSION_ENDED: 'Your wallet session ended. Please reconnect.',
  USER_CLOSED_MODAL: 'Wallet selection closed. No connection was made.',
  INVALID_ADDRESS: 'That is not a valid wallet address.',
  ALLOWANCE: 'The contract is not allowed to move this token.',
  NONCE: 'Your wallet has a pending transaction. Wait for it to confirm, then retry.',
  WRONG_NETWORK: 'Your wallet is connected, but BOT Chain is not active.',
  CONTRACT_NOT_CONFIGURED: 'No contract address is configured for the active network yet.',
  TOKEN_NOT_FOUND: 'Could not read the passport from the blockchain.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

/**
 * Classify a raw error into a stable category string.
 * Used internally and by tests/debug tooling.
 */
export function classifyError(error) {
  if (!error) return 'UNKNOWN';

  const code = Number(error?.code);
  if (code === CODE_USER_REJECTED) return 'USER_REJECTED';
  if (code === CODE_CHAIN_NOT_CONFIGURED) return 'CHAIN_NOT_CONFIGURED';
  if (code === CODE_ALREADY_PROCESSING) return 'ALREADY_PROCESSING';

  // WalletConnect error payloads sometimes nest the real error under `data`.
  const message = [
    error?.shortMessage,
    error?.details,
    error?.message,
    error?.data?.message,
    error?.data?.reason,
    typeof error === 'string' ? error : null,
  ]
    .filter(Boolean)
    .join(' ');

  for (const entry of SUBSTRINGS) {
    if (entry.pattern.test(message)) return entry.category;
  }

  if (code === CODE_ACTION_REJECTED && /reject/i.test(message)) return 'USER_REJECTED';

  return 'UNKNOWN';
}

/**
 * Convert any error into a short, honest, friendly message.
 * `context` lets callers override the message for a known situation
 * (e.g. "while minting your passport").
 */
export function friendlyError(error, context = {}) {
  const category = classifyError(error);

  if (category === 'UNKNOWN') {
    // Try to extract something useful, but never dump a raw stack trace.
    const raw =
      error?.shortMessage ||
      error?.details ||
      (typeof error === 'string' ? error : null);
    console.error('[RICIPT] Unhandled error:', error);
    if (raw && raw.length < 160) return `${MESSAGES.UNKNOWN} ${raw}`.trim();
    return MESSAGES.UNKNOWN;
  }

  console.error('[RICIPT] Error:', error, `(category=${category})`);
  return MESSAGES[category] || MESSAGES.UNKNOWN;
}

export const errorMessages = MESSAGES;

// Convenience validator used by TransferModal.
export function looksLikeAddress(value) {
  return viemIsAddress(String(value || '').trim());
}