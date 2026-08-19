/**
 * QR helpers.
 *
 * The QR code ONLY encodes a public verification URL like
 *     https://<origin>/verify?tokenId=123
 * Sensitive data (IMEI, serial, receipt image, receipt number) is NEVER
 * encoded. The Verify page reads whatever is on-chain; the QR just says
 * "go look at this token's public record".
 */
import { getActiveNetwork } from '../config/chains.js';

/**
 * Build the public verify URL for a token id using the current origin.
 * Deterministic and safe for QR encoding.
 */
export function buildVerifyUrl(tokenId) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/verify?tokenId=${encodeURIComponent(tokenId)}`;
}

/**
 * Build the explorer URL for a token on the ACTIVE network.
 * Uses the network config so it always points at the right explorer.
 */
export function buildExplorerTokenUrl(tokenId) {
  const explorerUrl = getActiveNetwork().explorerUrl;
  return `${explorerUrl}/token/0x${tokenId}?a=${tokenId}`;
}

// Whitelist of what may appear inside a QR payload. If a future feature
// wants to add fields, it must extend this list deliberately.
export const QR_ALLOWED_PAYLOAD_KEYS = ['tokenId'];