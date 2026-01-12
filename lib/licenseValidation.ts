/**
 * Driver license validation helpers.
 *
 * This module centralizes the manual license entry rules so both client and
 * server can enforce the same checks without duplicating logic.
 */

export type LicensePattern = {
  // Regex that enforces the exact format for this state pattern.
  regex: RegExp;
  // Human-readable description used in validation errors.
  description: string;
  // Length bounds for quick error messaging.
  minLength: number;
  maxLength: number;
};

export type LicenseFormatRule = {
  patterns: LicensePattern[];
};

// State-by-state license number rules (multiple patterns per state).
export const US_STATE_RULES = {
  AL: {
    patterns: [{ regex: /^\d{1,8}$/, description: "1-8 Numeric", minLength: 1, maxLength: 8 }]
  },
  AK: {
    patterns: [{ regex: /^\d{1,7}$/, description: "1-7 Numeric", minLength: 1, maxLength: 7 }]
  },
  AZ: {
    patterns: [
      { regex: /^[A-Za-z]\d{8}$/, description: "1 Alpha + 8 Numeric", minLength: 9, maxLength: 9 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  AR: {
    patterns: [{ regex: /^\d{4,9}$/, description: "4-9 Numeric", minLength: 4, maxLength: 9 }]
  },
  CA: {
    patterns: [{ regex: /^[A-Za-z]\d{7}$/, description: "1 Alpha + 7 Numeric", minLength: 8, maxLength: 8 }]
  },
  CO: {
    patterns: [
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 },
      { regex: /^[A-Za-z]\d{3,6}$/, description: "1 Alpha + 3-6 Numeric", minLength: 4, maxLength: 7 },
      { regex: /^[A-Za-z]{2}\d{2,5}$/, description: "2 Alpha + 2-5 Numeric", minLength: 4, maxLength: 7 }
    ]
  },
  CT: {
    patterns: [{ regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }]
  },
  DE: {
    patterns: [{ regex: /^\d{1,7}$/, description: "1-7 Numeric", minLength: 1, maxLength: 7 }]
  },
  DC: {
    patterns: [
      { regex: /^\d{7}$/, description: "7 Numeric", minLength: 7, maxLength: 7 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  FL: {
    patterns: [{ regex: /^[A-Za-z]\d{12}$/, description: "1 Alpha + 12 Numeric", minLength: 13, maxLength: 13 }]
  },
  GA: {
    patterns: [{ regex: /^\d{7,9}$/, description: "7-9 Numeric", minLength: 7, maxLength: 9 }]
  },
  HI: {
    patterns: [
      { regex: /^[A-Za-z]\d{8}$/, description: "1 Alpha + 8 Numeric", minLength: 9, maxLength: 9 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  ID: {
    patterns: [
      { regex: /^[A-Za-z]{2}\d{6}[A-Za-z]$/, description: "2 Alpha + 6 Numeric + 1 Alpha", minLength: 9, maxLength: 9 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  IL: {
    patterns: [{ regex: /^[A-Za-z]\d{11,12}$/, description: "1 Alpha + 11-12 Numeric", minLength: 12, maxLength: 13 }]
  },
  IN: {
    patterns: [
      { regex: /^[A-Za-z]\d{9}$/, description: "1 Alpha + 9 Numeric", minLength: 10, maxLength: 10 },
      { regex: /^\d{9,10}$/, description: "9-10 Numeric", minLength: 9, maxLength: 10 }
    ]
  },
  IA: {
    patterns: [
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 },
      { regex: /^\d{3}[A-Za-z]{2}\d{4}$/, description: "3 Numeric + 2 Alpha + 4 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  KS: {
    patterns: [
      { regex: /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]$/, description: "1 Alpha + 1 Numeric + 1 Alpha + 1 Numeric + 1 Alpha", minLength: 5, maxLength: 5 },
      { regex: /^[A-Za-z]\d{8}$/, description: "1 Alpha + 8 Numeric", minLength: 9, maxLength: 9 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  KY: {
    patterns: [
      { regex: /^[A-Za-z]\d{8}$/, description: "1 Alpha + 8 Numeric", minLength: 9, maxLength: 9 },
      { regex: /^[A-Za-z]\d{9}$/, description: "1 Alpha + 9 Numeric", minLength: 10, maxLength: 10 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  LA: {
    patterns: [{ regex: /^\d{1,9}$/, description: "1-9 Numeric", minLength: 1, maxLength: 9 }]
  },
  ME: {
    patterns: [
      { regex: /^\d{7}$/, description: "7 Numeric", minLength: 7, maxLength: 7 },
      { regex: /^\d{7}[A-Za-z]$/, description: "7 Numeric + 1 Alpha", minLength: 8, maxLength: 8 },
      { regex: /^\d{8}$/, description: "8 Numeric", minLength: 8, maxLength: 8 }
    ]
  },
  MD: {
    patterns: [{ regex: /^[A-Za-z]\d{12}$/, description: "1 Alpha + 12 Numeric", minLength: 13, maxLength: 13 }]
  },
  MA: {
    patterns: [
      { regex: /^[A-Za-z]\d{8}$/, description: "1 Alpha + 8 Numeric", minLength: 9, maxLength: 9 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  MI: {
    patterns: [
      { regex: /^[A-Za-z]\d{10}$/, description: "1 Alpha + 10 Numeric", minLength: 11, maxLength: 11 },
      { regex: /^[A-Za-z]\d{12}$/, description: "1 Alpha + 12 Numeric", minLength: 13, maxLength: 13 }
    ]
  },
  MN: {
    patterns: [{ regex: /^[A-Za-z]\d{12}$/, description: "1 Alpha + 12 Numeric", minLength: 13, maxLength: 13 }]
  },
  MS: {
    patterns: [{ regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }]
  },
  MO: {
    patterns: [
      { regex: /^\d{3}[A-Za-z]\d{6}$/, description: "3 Numeric + 1 Alpha + 6 Numeric", minLength: 10, maxLength: 10 },
      { regex: /^[A-Za-z]\d{5,9}$/, description: "1 Alpha + 5-9 Numeric", minLength: 6, maxLength: 10 },
      { regex: /^[A-Za-z]\d{6}R$/, description: "1 Alpha + 6 Numeric + R", minLength: 8, maxLength: 8 },
      { regex: /^\d{8}[A-Za-z]{2}$/, description: "8 Numeric + 2 Alpha", minLength: 10, maxLength: 10 },
      { regex: /^\d{9}[A-Za-z]$/, description: "9 Numeric + 1 Alpha", minLength: 10, maxLength: 10 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  MT: {
    patterns: [
      { regex: /^[A-Za-z]{3}\d{10}$/, description: "3 Alpha + 10 Numeric", minLength: 13, maxLength: 13 },
      { regex: /^[A-Za-z]\d{8}$/, description: "1 Alpha + 8 Numeric", minLength: 9, maxLength: 9 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 },
      { regex: /^\d{13,14}$/, description: "13-14 Numeric", minLength: 13, maxLength: 14 }
    ]
  },
  NE: {
    patterns: [{ regex: /^[A-Za-z]\d{6,8}$/, description: "1 Alpha + 6-8 Numeric", minLength: 7, maxLength: 9 }]
  },
  NV: {
    patterns: [
      { regex: /^\d{9,10}$/, description: "9-10 Numeric", minLength: 9, maxLength: 10 },
      { regex: /^\d{12}$/, description: "12 Numeric", minLength: 12, maxLength: 12 },
      { regex: /^[Xx]\d{8}$/, description: "X + 8 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  NH: {
    patterns: [{ regex: /^\d{2}[A-Za-z]{3}\d{5}$/, description: "2 Numeric + 3 Alpha + 5 Numeric", minLength: 10, maxLength: 10 }]
  },
  NJ: {
    patterns: [{ regex: /^[A-Za-z]\d{14}$/, description: "1 Alpha + 14 Numeric", minLength: 15, maxLength: 15 }]
  },
  NM: {
    patterns: [{ regex: /^\d{8,9}$/, description: "8-9 Numeric", minLength: 8, maxLength: 9 }]
  },
  NY: {
    patterns: [
      { regex: /^[A-Za-z]\d{7}$/, description: "1 Alpha + 7 Numeric", minLength: 8, maxLength: 8 },
      { regex: /^[A-Za-z]\d{18}$/, description: "1 Alpha + 18 Numeric", minLength: 19, maxLength: 19 },
      { regex: /^\d{8,9}$/, description: "8-9 Numeric", minLength: 8, maxLength: 9 },
      { regex: /^\d{16}$/, description: "16 Numeric", minLength: 16, maxLength: 16 },
      { regex: /^[A-Za-z]{8}$/, description: "8 Alpha", minLength: 8, maxLength: 8 }
    ]
  },
  NC: {
    patterns: [{ regex: /^\d{1,12}$/, description: "1-12 Numeric", minLength: 1, maxLength: 12 }]
  },
  ND: {
    patterns: [
      { regex: /^[A-Za-z]{3}\d{6}$/, description: "3 Alpha + 6 Numeric", minLength: 9, maxLength: 9 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  OH: {
    patterns: [
      { regex: /^[A-Za-z]\d{4,8}$/, description: "1 Alpha + 4-8 Numeric", minLength: 5, maxLength: 9 },
      { regex: /^[A-Za-z]{2}\d{3,7}$/, description: "2 Alpha + 3-7 Numeric", minLength: 5, maxLength: 9 },
      { regex: /^\d{8}$/, description: "8 Numeric", minLength: 8, maxLength: 8 }
    ]
  },
  OK: {
    patterns: [
      { regex: /^[A-Za-z]\d{9}$/, description: "1 Alpha + 9 Numeric", minLength: 10, maxLength: 10 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  OR: {
    patterns: [{ regex: /^\d{1,9}$/, description: "1-9 Numeric", minLength: 1, maxLength: 9 }]
  },
  PA: {
    patterns: [{ regex: /^\d{8}$/, description: "8 Numeric", minLength: 8, maxLength: 8 }]
  },
  RI: {
    patterns: [
      { regex: /^\d{7}$/, description: "7 Numeric", minLength: 7, maxLength: 7 },
      { regex: /^[A-Za-z]\d{6}$/, description: "1 Alpha + 6 Numeric", minLength: 7, maxLength: 7 }
    ]
  },
  SC: {
    patterns: [{ regex: /^\d{5,11}$/, description: "5-11 Numeric", minLength: 5, maxLength: 11 }]
  },
  SD: {
    patterns: [
      { regex: /^\d{6,10}$/, description: "6-10 Numeric", minLength: 6, maxLength: 10 },
      { regex: /^\d{12}$/, description: "12 Numeric", minLength: 12, maxLength: 12 }
    ]
  },
  TN: {
    patterns: [{ regex: /^\d{7,9}$/, description: "7-9 Numeric", minLength: 7, maxLength: 9 }]
  },
  TX: {
    patterns: [{ regex: /^\d{7,8}$/, description: "7-8 Numeric", minLength: 7, maxLength: 8 }]
  },
  UT: {
    patterns: [{ regex: /^\d{4,10}$/, description: "4-10 Numeric", minLength: 4, maxLength: 10 }]
  },
  VT: {
    patterns: [
      { regex: /^\d{8}$/, description: "8 Numeric", minLength: 8, maxLength: 8 },
      { regex: /^\d{7}A$/, description: "7 Numeric + A", minLength: 8, maxLength: 8 }
    ]
  },
  VA: {
    patterns: [
      { regex: /^[A-Za-z]\d{8,11}$/, description: "1 Alpha + 8-11 Numeric", minLength: 9, maxLength: 12 },
      { regex: /^\d{9}$/, description: "9 Numeric", minLength: 9, maxLength: 9 }
    ]
  },
  WA: {
    patterns: [
      {
        regex: /^(?=.{12}$)[A-Za-z]{1,7}[A-Za-z0-9]+$/,
        description: "1-7 Alpha + any combination of Alpha/Numeric (total 12)",
        minLength: 12,
        maxLength: 12
      }
    ]
  },
  WV: {
    patterns: [
      { regex: /^\d{7}$/, description: "7 Numeric", minLength: 7, maxLength: 7 },
      { regex: /^[A-Za-z]{1,2}\d{5,6}$/, description: "1-2 Alpha + 5-6 Numeric", minLength: 6, maxLength: 8 }
    ]
  },
  WI: {
    patterns: [{ regex: /^[A-Za-z]\d{13}$/, description: "1 Alpha + 13 Numeric", minLength: 14, maxLength: 14 }]
  },
  WY: {
    patterns: [{ regex: /^\d{9,10}$/, description: "9-10 Numeric", minLength: 9, maxLength: 10 }]
  }
} as const satisfies Record<string, LicenseFormatRule>;

export type USStateCode = keyof typeof US_STATE_RULES;

// Display-friendly options for the issuing state dropdown.
export const US_STATE_OPTIONS: Array<{ code: USStateCode; name: string }> = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" }
];

export type DriverLicenseInput = {
  legalName?: string;
  licenseNumber?: string;
  licenseExpirationDate?: string;
  issuingState?: string;
};

export type DriverLicenseValidationErrors = Record<string, string>;

function hasValidNameCharacters(value: string) {
  return /^[A-Za-z][A-Za-z\s'-]*$/.test(value);
}

function hasAnyLetter(value: string) {
  return /[A-Za-z]/.test(value);
}

// Detect obviously fake repeated sequences like "AAAAAA" or "000000".
function isAllSameCharacter(value: string) {
  const normalized = value.toUpperCase();
  return normalized.split("").every((char) => char === normalized[0]);
}

// Detect obvious sequential patterns like 123456 or 987654.
function isSequentialDigits(value: string) {
  const digits = value.split("").map((char) => Number(char));
  if (digits.some((num) => Number.isNaN(num))) return false;
  const ascending = digits.every((num, index) => index === 0 || num === digits[index - 1] + 1);
  const descending = digits.every((num, index) => index === 0 || num === digits[index - 1] - 1);
  return ascending || descending;
}

// Detect obvious alphabetic runs like ABCDEF or FEDCBA.
function isSequentialLetters(value: string) {
  const letters = value.toUpperCase().split("").map((char) => char.charCodeAt(0));
  const ascending = letters.every((code, index) => index === 0 || code === letters[index - 1] + 1);
  const descending = letters.every((code, index) => index === 0 || code === letters[index - 1] - 1);
  return ascending || descending;
}

export function isValidIssuingState(value?: string): value is USStateCode {
  if (!value) return false;
  return Object.prototype.hasOwnProperty.call(US_STATE_RULES, value);
}

export function normalizeExpirationDate(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

export function validateLegalName(value?: string): string | undefined {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "Legal name is required for driver registration";
  if (trimmed.length < 2) return "Legal name must be at least 2 characters long";
  if (!hasValidNameCharacters(trimmed)) {
    return "Legal name can only include letters, spaces, hyphens, and apostrophes";
  }
  if (!hasAnyLetter(trimmed)) {
    return "Legal name must include at least one letter";
  }
  return undefined;
}

export function validateIssuingState(value?: string): string | undefined {
  if (!value) return "Issuing state is required for driver registration";
  if (!isValidIssuingState(value)) {
    return "Issuing state must be a valid U.S. state or DC";
  }
  return undefined;
}

export function validateLicenseExpirationDate(value?: string): string | undefined {
  const normalized = normalizeExpirationDate(value);
  if (!normalized) return "License expiration date is required";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiration = new Date(normalized);
  expiration.setHours(0, 0, 0, 0);

  const daysUntilExpiration = Math.ceil(
    (expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiration < 7) {
    return "License expiration date must be at least 7 days in the future";
  }
  return undefined;
}

export function validateLicenseNumber(
  value?: string,
  issuingState?: USStateCode
): string | undefined {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "License number is required for driver registration";
  if (!issuingState) return "Issuing state is required to validate license number";

  const rule = US_STATE_RULES[issuingState];
  const length = trimmed.length;
  const minLength = Math.min(...rule.patterns.map((pattern) => pattern.minLength));
  const maxLength = Math.max(...rule.patterns.map((pattern) => pattern.maxLength));
  // if (length < minLength || length > maxLength) {
  //   return `License number must be ${minLength}-${maxLength} characters for ${issuingState}`;
  // }

  if (/\s/.test(trimmed)) {
    return "License number must not include whitespace";
  }

  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
    return "License number must not include special characters";
  }

  // Require a match to at least one known pattern for the issuing state.
  if (!rule.patterns.some((pattern) => pattern.regex.test(trimmed))) {
    const expected = rule.patterns.map((pattern) => pattern.description).join("; ");
    return `License number does not match the required format for ${issuingState}`;
  }

  if (isAllSameCharacter(trimmed)) {
    return "License number cannot be a repeated sequence";
  }

  if ((/^[0-9]+$/.test(trimmed) && isSequentialDigits(trimmed)) ||
      (/^[A-Za-z]+$/.test(trimmed) && isSequentialLetters(trimmed))) {
    return "License number cannot be an obvious sequence";
  }

  return undefined;
}

export function validateDriverLicenseInput(
  input: DriverLicenseInput
): DriverLicenseValidationErrors {
  const errors: DriverLicenseValidationErrors = {};

  const legalNameError = validateLegalName(input.legalName);
  if (legalNameError) errors.legalName = legalNameError;

  const issuingStateError = validateIssuingState(input.issuingState);
  if (issuingStateError) errors.issuingState = issuingStateError;

  const licenseNumberError = validateLicenseNumber(
    input.licenseNumber,
    isValidIssuingState(input.issuingState) ? input.issuingState : undefined
  );
  if (licenseNumberError) errors.licenseNumber = licenseNumberError;

  const expirationError = validateLicenseExpirationDate(input.licenseExpirationDate);
  if (expirationError) errors.licenseExpirationDate = expirationError;

  return errors;
}
