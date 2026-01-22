/**
 * Validates the user name based on the following rules:
 * Should be unique, First 3 chars should be letters, 3 <= length < 15
 * Can only include the following speacial chars: _, @, -
 */
export type UserNameValidation = {
  normalized: string | null;
  error: string | null;
};

const ALLOWED_USERNAME = /^[a-z0-9_@-]+$/;

// converts the username to a normalized version: with no trailing whitespaces and all lowercase
export function normalizeUserName(input: string): string {
  return input.trim().toLowerCase();
}

// validation function: ensures the names follow the naming rules
export function validateUserName(input: string): UserNameValidation {
  if (!input || !input.trim()) {
    return { normalized: null, error: "Username is required." };
  }

  const normalized = normalizeUserName(input);

  if (normalized.length < 3) {
    return { normalized, error: "Username must be at least 3 characters." };
  }

  if (normalized.length > 15) {
    return { normalized, error: "Username must be 15 characters or less." };
  }

  if (!ALLOWED_USERNAME.test(normalized)) {
    return {
      normalized,
      error: "Username can only use letters, numbers, and _, @, -.",
    };
  }

  if (!/^[a-z]{3}/.test(normalized)) {
    return {
      normalized,
      error: "Username must start with three letters.",
    };
  }


  return { normalized, error: null };
}
