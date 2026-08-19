/**
 * Formatting helpers for wallet addresses, timestamps, prices, etc.
 * Keeps number/date/hex formatting in one place so the UI stays consistent.
 */

/**
 * Shorten an Ethereum-style address for display: 0x1234...5678.
 * Returns the input unchanged if it does not look like an address.
 */
export function shortAddress(address, start = 6, end = 4) {
  const a = String(address || '');
  if (a.length < start + end + 3) return a;
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) return a;
  return `${a.slice(0, start + 2)}...${a.slice(-end)}`;
}

/**
 * Format a unix timestamp (seconds) as a human-readable date string.
 * e.g. 1755561600 -> "Aug 18, 2025". Returns "—" for falsy input.
 */
export function formatTimestamp(seconds) {
  if (!seconds) return '—';
  const ms = Number(seconds) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatFullTimestamp(seconds) {
  if (!seconds) return '—';
  const ms = Number(seconds) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  try {
    return new Date(ms).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Truncate a 0x hash (transaction hash / data hash) for compact display.
 */
export function shortHash(hash, start = 10, end = 8) {
  const h = String(hash || '');
  if (h.length <= start + end + 2) return h;
  return `${h.slice(0, start)}...${h.slice(-end)}`;
}

/**
 * Display a price nicely. Values are stored/entered as plain decimal strings
 * (e.g. "1499.99"); we only format, we never do arithmetic on floats for
 * anything that matters.
 */
export function formatPrice(price, currency) {
  const n = Number(price);
  if (!Number.isFinite(n)) return '—';
  const formatted = n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return currency ? `${formatted} ${currency}` : formatted;
}

/**
 * Build a BOT Chain explorer URL for a transaction hash.
 * Falls back to a plain "view on explorer" message when address config is
 * missing (should not happen — explorer URL always comes from the network
 * config files).
 */
export function explorerTxUrl(explorerUrl, txHash) {
  if (!explorerUrl || !txHash) return null;
  return `${explorerUrl}/tx/${txHash}`;
}

export function explorerAddressUrl(explorerUrl, address) {
  if (!explorerUrl || !address) return null;
  return `${explorerUrl}/address/${address}`;
}

export function explorerTokenUrl(explorerUrl, tokenId) {
  if (!explorerUrl || !tokenId) return null;
  return `${explorerUrl}/token/0x${tokenId}?a=${tokenId}`;
}