/**
 * Deterministic hashing of passport data.
 *
 * The goal: a hash that provably commits to a specific dataset, while keeping
 * the raw sensitive fields (IMEI, serial, receipt number) OUT of the hash and
 * off-chain. Only the hash goes on-chain.
 *
 * Determinism rules:
 *   - The object keys are always written in a fixed order (see buildCanonicalObject).
 *   - Values are trimmed strings, so "Galaxy" and " Galaxy " hash the same.
 *   - The hash is keccak256 of the UTF-8 bytes of the canonical JSON.
 *
 * IMPORTANT — honesty note (also in README):
 *   This hash proves "this dataset was used when the passport was created".
 *   It does NOT prove the purchase was legitimate, the retailer was real,
 *   the device exists, or the entered data is truthful.
 */
import { keccak256, toBytes } from 'viem';

/**
 * Build the canonical, always-fixed-order object that gets hashed.
 * The key ORDER matters — JSON.stringify preserves insertion order, so we
 * insert keys in exactly the order defined here. Do not "helpfully" reorder.
 *
 * Returns a plain object (not yet stringified).
 */
export function buildCanonicalObject(passportData) {
  const clean = (value) => (value == null ? '' : String(value).trim());

  return {
    deviceType: clean(passportData.deviceType),
    manufacturer: clean(passportData.manufacturer),
    model: clean(passportData.model),
    purchaseDate: clean(passportData.purchaseDate),
    retailer: clean(passportData.retailer),
    price: clean(passportData.price),
    currency: clean(passportData.currency),
    warranty: clean(passportData.warranty),
    issuer: clean(passportData.issuer),
  };
}

/**
 * Return the canonical JSON string for a set of passport data.
 * Deterministic given the same inputs.
 */
export function canonicalizePassport(passportData) {
  return JSON.stringify(buildCanonicalObject(passportData));
}

/**
 * Compute the 0x-prefixed keccak256 hash of the canonical passport data.
 */
export function hashPassportData(passportData) {
  const canonical = canonicalizePassport(passportData);
  return keccak256(toBytes(canonical));
}

/**
 * Verify that a previously recorded dataHash matches a given dataset.
 * Useful for the Verify page: given the on-chain hash and a locally-known
 * dataset, we can prove the dataset matches what was minted.
 * Returns a boolean; never throws for normal input.
 */
export function verifyPassportDataHash(dataHash, passportData) {
  try {
    return hashPassportData(passportData).toLowerCase() === String(dataHash).toLowerCase();
  } catch {
    return false;
  }
}