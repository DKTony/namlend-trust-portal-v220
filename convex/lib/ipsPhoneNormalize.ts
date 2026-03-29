/**
 * Namibian Mobile Number Normalization — per IPN Product Rules v0.5 §9.5.3.
 *
 * Rules:
 *   - Strip leading country code: +264, 00264, 264
 *   - Strip leading trunk prefix: 0
 *   - Store as 9-digit number (e.g., 812345678)
 *   - Valid Namibian mobile prefixes: 81 (MTC), 85 (TN Mobile), 84 (Paratus)
 *   - One mobile number per device at a time
 *
 * Examples:
 *   +264812345678  → 812345678
 *   00264812345678 → 812345678
 *   264812345678   → 812345678
 *   0812345678     → 812345678
 *   812345678      → 812345678
 */

/** Known Namibian mobile network prefixes (first 2 digits after normalization) */
const VALID_MOBILE_PREFIXES = ['81', '85', '84'];

/**
 * Normalize a Namibian mobile number to 9-digit format.
 * Returns the normalized number or null if the input is invalid.
 */
export function normalizeNamibianMobile(raw: string): string | null {
  // Strip all whitespace, dashes, parentheses, dots
  let cleaned = raw.replace(/[\s\-().+]/g, '');

  // Strip international prefix: 00264 or 264
  if (cleaned.startsWith('00264')) {
    cleaned = cleaned.slice(5);
  } else if (cleaned.startsWith('264') && cleaned.length > 9) {
    cleaned = cleaned.slice(3);
  }

  // Strip trunk prefix: leading 0
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = cleaned.slice(1);
  }

  // Validate: must be exactly 9 digits
  if (cleaned.length !== 9 || !/^\d{9}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Validate that a normalized 9-digit number is a valid Namibian mobile number.
 * Must start with a known mobile prefix (81, 85, 84).
 */
export function isValidNamibianMobile(normalized: string): boolean {
  if (normalized.length !== 9 || !/^\d{9}$/.test(normalized)) {
    return false;
  }
  const prefix = normalized.slice(0, 2);
  return VALID_MOBILE_PREFIXES.includes(prefix);
}

/**
 * Format a normalized 9-digit number back to display format: +264 XX XXX XXXX
 */
export function formatNamibianMobile(normalized: string): string {
  if (normalized.length !== 9) return normalized;
  return `+264 ${normalized.slice(0, 2)} ${normalized.slice(2, 5)} ${normalized.slice(5)}`;
}
