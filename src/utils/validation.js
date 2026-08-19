/**
 * Client-side validation helpers.
 *
 * All user input passes through here before it can reach a transaction.
 * We validate early so that bad data never wastes a wallet signature.
 */
import { isAddress as viemIsAddress } from 'viem';

const MAX_SERIAL_LENGTH = 64;
const MAX_MODEL_LENGTH = 80;
const MAX_MANUFACTURER_LENGTH = 80;
const MAX_RETAILER_LENGTH = 120;
const MAX_IMEI_LENGTH = 24;
const MAX_RECEIPT_LENGTH = 64;
const MAX_PRICE_DECIMALS = 8;

// Basic IPv4/name heuristics are out of scope — this is a *verification*
// helper, not a security boundary. It returns { valid, message } so callers
// can show one friendly line per field.

export function isValidEthereumAddress(value) {
  return viemIsAddress(String(value || '').trim());
}

export function isValidTokenId(value) {
  if (value == null || String(value).trim() === '') return false;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 1;
}

export function validateRequired(value, label) {
  if (!value || String(value).trim() === '') {
    return { valid: false, message: `${label} is required.` };
  }
  return { valid: true };
}

export function validateSerialNumber(value) {
  if (!value || String(value).trim() === '') {
    return { valid: false, message: 'Serial number is required.' };
  }
  if (String(value).trim().length > MAX_SERIAL_LENGTH) {
    return { valid: false, message: `Serial number must be ${MAX_SERIAL_LENGTH} characters or fewer.` };
  }
  return { valid: true };
}

export function validateImei(value) {
  if (!value || String(value).trim() === '') {
    // IMEI is optional in the MVP.
    return { valid: true };
  }
  const digits = String(value).trim().replace(/\s+/g, '');
  if (!/^\d{15}$/.test(digits)) {
    return { valid: false, message: 'IMEI must be exactly 15 digits (with or without spaces).' };
  }
  return { valid: true };
}

export function validateModel(value) {
  const s = String(value || '').trim();
  if (!s) return { valid: false, message: 'Model is required.' };
  if (s.length > MAX_MODEL_LENGTH) {
    return { valid: false, message: `Model must be ${MAX_MODEL_LENGTH} characters or fewer.` };
  }
  return { valid: true };
}

export function validateManufacturer(value) {
  const s = String(value || '').trim();
  if (!s) return { valid: false, message: 'Manufacturer is required.' };
  if (s.length > MAX_MANUFACTURER_LENGTH) {
    return { valid: false, message: `Manufacturer must be ${MAX_MANUFACTURER_LENGTH} characters or fewer.` };
  }
  return { valid: true };
}

export function validateRetailer(value) {
  const s = String(value || '').trim();
  if (!s) return { valid: false, message: 'Retailer is required.' };
  if (s.length > MAX_RETAILER_LENGTH) {
    return { valid: false, message: `Retailer must be ${MAX_RETAILER_LENGTH} characters or fewer.` };
  }
  return { valid: true };
}

export function validateReceiptNumber(value) {
  if (!value || String(value).trim() === '') {
    return { valid: true }; // optional
  }
  if (String(value).trim().length > MAX_RECEIPT_LENGTH) {
    return { valid: false, message: `Receipt number must be ${MAX_RECEIPT_LENGTH} characters or fewer.` };
  }
  return { valid: true };
}

/**
 * Purchase date validation. Accepts YYYY-MM-DD only (see the mobile-friendly
 * date input design). Rejects impossible dates like 2026-02-31 and future
 * dates (with a soft tolerance so a clock-skewed device doesn't block you).
 */
export function validatePurchaseDate(value, { allowFutureDays = 7 } = {}) {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { valid: false, message: 'Purchase date must use the YYYY-MM-DD format.' };
  }
  const [y, m, d] = raw.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { valid: false, message: 'That date does not exist. Check the month and day.' };
  }
  const today = new Date();
  const maxAllowed = new Date(today.getTime() + allowFutureDays * 24 * 60 * 60 * 1000);
  if (date.getTime() > maxAllowed.getTime()) {
    return { valid: false, message: 'Purchase date cannot be in the future.' };
  }
  return { valid: true };
}

/**
 * Price validation. Accepts "0", "1499", "1499.99". Rejects negatives, junk
 * text, and more than 8 decimal places (enough for any real currency).
 */
export function validatePrice(value) {
  const raw = String(value || '').trim();
  if (!raw) return { valid: false, message: 'Price is required.' };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { valid: false, message: 'Price must be a positive number.' };
  }
  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
  if (decimals > MAX_PRICE_DECIMALS) {
    return { valid: false, message: `Price supports at most ${MAX_PRICE_DECIMALS} decimal places.` };
  }
  return { valid: true };
}

export function validateCurrency(value) {
  const s = String(value || '').trim();
  if (!s) return { valid: false, message: 'Currency is required.' };
  if (!/^[A-Z]{3}$/.test(s)) return { valid: false, message: 'Currency must be a 3-letter code like USD.' };
  return { valid: true };
}

/**
 * Validate the whole CreatePassport form at once. Returns an object of
 * { fieldKey: message } for invalid fields (empty object = all good).
 */
export function validatePassportForm(form) {
  const errors = {};

  const merge = (field, res) => {
    if (!res.valid) errors[field] = res.message;
  };

  merge('deviceType', validateRequired(form.deviceType, 'Device type'));
  merge('manufacturer', validateManufacturer(form.manufacturer));
  merge('model', validateModel(form.model));
  merge('serialNumber', validateSerialNumber(form.serialNumber));
  merge('imei', validateImei(form.imei));
  merge('purchaseDate', validatePurchaseDate(form.purchaseDate));
  merge('retailer', validateRetailer(form.retailer));
  merge('receiptNumber', validateReceiptNumber(form.receiptNumber));
  merge('price', validatePrice(form.price));
  merge('currency', validateCurrency(form.currency));
  merge('warranty', validateRequired(form.warranty, 'Warranty'));

  return errors;
}