/**
 * TransactionStatus — renders the write-transaction state machine.
 *
 * Receives the `tx` object from usePassport() and prints a clear, honest
 * status line + step indicator. Never frozen, never raw stack traces.
 */
import { TX_STATES } from '../hooks/usePassport.js';
import { shortHash } from '../utils/formatting.js';
import { activeNetwork } from '../config/chains.js';

const STEP_LABELS = ['PREPARE', 'WALLET', 'SUBMIT', 'CONFIRM'];

function stepIndex(state) {
  switch (state) {
    case TX_STATES.PREPARING:
      return 0;
    case TX_STATES.AWAITING_WALLET:
      return 1;
    case TX_STATES.SUBMITTED:
    case TX_STATES.CONFIRMING:
      return 2;
    case TX_STATES.CONFIRMED:
      return 3;
    default:
      return -1;
  }
}

const MESSAGES = {
  [TX_STATES.PREPARING]: 'Preparing your transaction…',
  [TX_STATES.AWAITING_WALLET]: 'Check your wallet and approve the request.',
  [TX_STATES.SUBMITTED]: 'Transaction submitted to the network.',
  [TX_STATES.CONFIRMING]: 'Waiting for on-chain confirmation…',
  [TX_STATES.CONFIRMED]: 'Transaction confirmed.',
  [TX_STATES.FAILED]: 'Transaction failed.',
  [TX_STATES.IDLE]: '',
};

export default function TransactionStatus({ tx }) {
  if (!tx || tx.state === TX_STATES.IDLE) return null;

  const current = stepIndex(tx.state);
  const isConfirmed = tx.state === TX_STATES.CONFIRMED;
  const isFailed = tx.state === TX_STATES.FAILED;

  return (
    <div className={`tx-status${isConfirmed ? ' tx-status--ok' : ''}${isFailed ? ' tx-status--err' : ''}`}>
      <div className="tx-status__steps" aria-hidden="true">
        {STEP_LABELS.map((label, i) => (
          <div
            key={label}
            className={`tx-status__step${i < current ? ' tx-status__step--done' : ''}${i === current ? ' tx-status__step--active' : ''}`}
          >
            <span className="tx-status__dot">{i < current ? '✓' : i + 1}</span>
            <span className="tx-status__label">{label}</span>
          </div>
        ))}
      </div>

      <p className="tx-status__message">{MESSAGES[tx.state]}</p>

      {tx.hash && (
        <a
          className="tx-status__link"
          href={`${activeNetwork.explorerUrl}/tx/${tx.hash}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on explorer: {shortHash(tx.hash)}
        </a>
      )}

      {isFailed && tx.error && <p className="tx-status__error">{tx.error}</p>}
    </div>
  );
}