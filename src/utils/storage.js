/**
 * localStorage helpers — UI convenience ONLY.
 *
 * Honest framing (see README): localStorage is NOT secure storage. It is a
 * convenience cache for plaintext display metadata (so "My Passports" can
 * show "Samsung Galaxy S24" without re-entering it) and for drafts/recent
 * activity. The blockchain is the authoritative record of ownership, status
 * and the data hash. Nothing here should be treated as trusted.
 *
 * All keys are namespaced with "ricipt:" to avoid colliding with other apps
 * on the same origin.
 */
const NS = 'ricipt:';

// Metadata for a passport, stored per tokenId. Only display-friendly fields
// are kept locally. Sensitive fields (IMEI, serial, receipt number) are NOT
// persisted by default.
const METADATA_PREFIX = `${NS}meta:`;
const RECENT_KEY = `${NS}recent`;
const DRAFT_KEY = `${NS}draft`;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    // Corrupt JSON from an interrupted write — start fresh rather than crash.
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded / private mode — non-fatal. We simply skip caching.
    console.warn('[RICIPT] localStorage write failed (ignored):', key);
  }
}

/**
 * Save the display metadata for a freshly minted passport.
 * `data` should be the safe display object: deviceType, manufacturer, model,
 * purchaseDate, retailer, price, currency, warranty.
 * Never pass IMEI/serial/receipt here.
 */
export function savePassportMetadata(tokenId, data) {
  const safe = {
    deviceType: data.deviceType,
    manufacturer: data.manufacturer,
    model: data.model,
    purchaseDate: data.purchaseDate,
    retailer: data.retailer,
    price: data.price,
    currency: data.currency,
    warranty: data.warranty,
    // Server-provided? No. Local-created? Yes. Used to stamp who created it.
    locallyCreated: true,
  };
  writeJSON(`${METADATA_PREFIX}${tokenId}`, safe);
  addRecent(tokenId);
}

export function getPassportMetadata(tokenId) {
  return readJSON(`${METADATA_PREFIX}${tokenId}`, null);
}

export function removePassportMetadata(tokenId) {
  try {
    localStorage.removeItem(`${METADATA_PREFIX}${tokenId}`);
  } catch {
    /* ignore */
  }
}

/**
 * Keep a short list of recently viewed/minted token IDs (most recent first).
 * Purely for the "recently viewed" convenience on the Home page.
 */
export function addRecent(tokenId) {
  const list = getRecent().filter((id) => String(id) !== String(tokenId));
  list.unshift(String(tokenId));
  writeJSON(RECENT_KEY, list.slice(0, 20));
}

export function getRecent() {
  const list = readJSON(RECENT_KEY, []);
  return Array.isArray(list) ? list : [];
}

/**
 * Draft persistence for the Create Passport form.
 * Saves raw form state so a wallet rejection / page refresh does not destroy
 * a half-completed form.
 */
export function saveDraft(draft) {
  writeJSON(DRAFT_KEY, draft);
}

export function getDraft() {
  return readJSON(DRAFT_KEY, null);
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}