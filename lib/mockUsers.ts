/* 
Mock data store for user authentication and profiles.

MVP: In-memory store that persists during dev server session only.
     Data is lost on server restart.

Production: Replace all functions with database calls:
  - Use PostgreSQL, MongoDB, or similar database
  - Use connection pooling
  - Implement proper transactions for multi-step operations
  - Add database indexes on email, userId, sessionToken
  - Use Redis for session storage (faster, with TTL support)
*/

import type { User, Campus, DriverInfo } from "@/types/user";
import {
  isValidIssuingState,
  normalizeExpirationDate,
  validateDriverLicenseInput
} from "@/lib/licenseValidation";
import { updateLicenseDetails } from "@/lib/licenseExpiration";
import crypto from "crypto";

// In-memory stores (MVP only - replace with database in production)
let users: User[] = [];
let campuses: Campus[] = [];
let sessions: Map<string, { userId: string; expiresAt: string }> = new Map();

/**
 * Generate unique user ID
 * 
 * MVP: Timestamp + random string
 * Production: Use database auto-increment or UUID
 */
function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate secure random token for email verification and sessions
 * 
 * MVP: 32 random bytes (hex encoded)
 * Production: Consider using JWT tokens for sessions (with proper signing)
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate pseudonym for user (public display name)
 * 
 * MVP: Random adjective + noun + number
 * Production: 
 *   - Allow users to choose their own pseudonym (with uniqueness check)
 *   - Or use more sophisticated generation
 *   - Ensure pseudonyms are unique across campus
 */
function generatePseudonym(): string {
  const adjectives = ["Swift", "Bold", "Calm", "Bright", "Quick", "Wise", "Brave", "Kind"];
  const nouns = ["Rider", "Traveler", "Explorer", "Pilot", "Navigator", "Wanderer"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}

/**
 * Hash password for storage
 * 
 * MVP: SHA-256 hash (NOT SECURE - vulnerable to rainbow table attacks)
 * Production: Use bcrypt with salt rounds (10-12 recommended)
 *   Example: bcrypt.hashSync(password, 10)
 * 
 * NEVER store plain text passwords!
 */
function hashPassword(password: string): string {
  // In production, use: bcrypt.hashSync(password, 10)
  // For MVP, using a simple hash (NOT SECURE FOR PRODUCTION)
  return crypto.createHash("sha256").update(password).digest("hex");
}

/**
 * Verify password against stored hash
 * 
 * MVP: SHA-256 comparison
 * Production: Use bcrypt.compareSync(password, hash)
 */
function verifyPassword(password: string, hash: string): boolean {
  // In production, use: bcrypt.compareSync(password, hash)
  const inputHash = crypto.createHash("sha256").update(password).digest("hex");
  return inputHash === hash;
}

/**
 * Extract email domain and get/create campus
 * 
 * MVP: Auto-creates campus based on email domain
 * Production: 
 *   - Campuses should be pre-configured in database
 *   - Validate that email domain matches an existing campus
 *   - Don't auto-create campuses (security risk)
 *   - May need admin approval for new campuses
 */
function getCampusFromEmail(email: string): Campus {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    throw new Error("Invalid email format");
  }

  // Check if campus already exists
  let campus = campuses.find(c => c.emailDomain === domain);
  
  if (!campus) {
    // MVP: Auto-create campus (for development convenience)
    // Production: Throw error - campus must exist in database
    const campusName = domain.split(".")[0]
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    
    campus = {
      id: `campus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${campusName} Campus`,
      emailDomain: domain
    };
    campuses.push(campus);
  }

  return campus;
}

/**
 * Validate email domain is from a valid campus
 * 
 * MVP: Checks for .edu
 * Production: 
 *   - Check against database of approved campus domains
 *   - May need to support additional international domains
 *   - Consider allowing admin to add custom domains per campus
 */
function isValidCampusEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain?.endsWith(".edu");
}

/**
 * Initialize with seed data (optional)
 * 
 * MVP: Creates example campus for testing
 * Production: Remove or use for database migrations
 */
function seedData() {
  // Add some example campuses
  campuses = [
    {
      id: "campus_1",
      name: "Example University Campus",
      emailDomain: "example.edu"
    }
  ];
}

// Initialize seed data on first load
if (campuses.length === 0) {
  seedData();
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get user by ID
 * 
 * MVP: In-memory array search
 * Production: Database query with index on userId
 */
export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

/**
 * Get user by email
 * 
 * MVP: In-memory array search (case-insensitive)
 * Production: Database query with index on email (case-insensitive)
 */
export function getUserByEmail(email: string): User | undefined {
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

/**
 * Create new user account
 * 
 * FLOW:
 * 1. Validate email domain is from valid campus
 * 2. Check if user already exists
 * 3. Get or create campus based on email domain
 * 4. Generate verification token and pseudonym
 * 5. If license details provided: validate manual license details and enable driver
 * 6. Create user record (email not verified yet)
 * 7. Return user and verification token
 * 
 * MVP: 
 *   - License verification is basic (validates manual entry)
 *   - Verification token returned in response (for dev testing)
 * 
 * Production:
 *   - Send verification email with token (never return token in response)
 *   - Use authoritative services to validate license details
 *   - Add rate limiting to prevent spam registrations
 *   - Add CAPTCHA for bot protection
 *   - Log registration attempts for security monitoring
 */
export function createUser(data: {
  email: string;
  password: string;
  wantsToDrive?: boolean;
  legalName?: string;
  licenseNumber?: string;
  licenseExpirationDate?: string;
  issuingState?: string;
}): { user: User; verificationToken: string } {
  // Validate email domain
  if (!isValidCampusEmail(data.email)) {
    throw new Error("Email must be from a valid campus domain (.edu)");
  }

  // Check if user already exists
  if (getUserByEmail(data.email)) {
    throw new Error("User with this email already exists");
  }

  // Get or create campus
  const campus = getCampusFromEmail(data.email);

  // Generate user data
  const now = new Date().toISOString();
  const verificationToken = generateToken();
  const pseudonym = generatePseudonym();

  // Driver info (if applicable)
  // Everyone is a rider by default. Driver is an optional add-on.
  let driverInfo: DriverInfo | undefined;
  // Driver info is only created when full license details are provided.
  // This allows signup to capture intent without enabling driver capability.
  const hasDriverDetails =
    data.legalName || data.licenseNumber || data.licenseExpirationDate || data.issuingState;

  if (hasDriverDetails) {
    // Validate manual license fields with shared rules (state rules + expiration window).
    const licenseErrors = validateDriverLicenseInput({
      legalName: data.legalName,
      licenseNumber: data.licenseNumber,
      licenseExpirationDate: data.licenseExpirationDate,
      issuingState: data.issuingState
    });

    if (Object.keys(licenseErrors).length > 0) {
      // Surface the first validation error to keep the response concise.
      const firstError = Object.values(licenseErrors)[0];
      throw new Error(firstError);
    }

    const normalizedExpiration = normalizeExpirationDate(data.licenseExpirationDate);
    
    // Create driver info with verification timestamps
    const now = new Date().toISOString();
    driverInfo = {
      legalName: data.legalName?.trim() || "",
      // Manual entry: store license details as provided after validation.
      licenseNumber: data.licenseNumber?.trim(),
      issuingState: isValidIssuingState(data.issuingState) ? data.issuingState : undefined,
      licenseExpirationDate: normalizedExpiration,
      verified: true, // MVP: auto-verified. Production: may require manual review
      verifiedAt: now, // First verification timestamp
      lastVerifiedAt: now, // Last verification timestamp (same as first for initial registration)
      expirationAlertsSent: {} // Initialize alert tracking - no alerts sent yet
    };
  }

  // Create user record
  const user: User = {
    id: generateId(),
    email: data.email.toLowerCase(),
    passwordHash: hashPassword(data.password),
    campusId: campus.id,
    pseudonym,
    // Driver availability is enabled only when driverInfo is created.
    isDriverAvailable: Boolean(driverInfo),
    driverInfo,
    emailVerified: false, // Email not verified yet - user must click verification link
    emailVerificationToken: verificationToken,
    createdAt: now,
    updatedAt: now,
    ridesCompleted: 0,
    noShowCount: 0
  };

  users.push(user);
  return { user, verificationToken };
}

/**
 * Verify user email with verification token
 * 
 * FLOW:
 * 1. Find user by verification token
 * 2. Mark email as verified
 * 3. Clear verification token (one-time use)
 * 4. Update timestamps
 * 
 * MVP: Token is in URL query parameter
 * Production:
 *   - Tokens should expire after 24-48 hours
 *   - Add rate limiting to prevent token brute force
 *   - Log verification attempts for security
 */
export function verifyEmail(token: string): User | null {
  const user = users.find(u => u.emailVerificationToken === token);
  if (!user) {
    return null; // Invalid or expired token
  }

  const now = new Date().toISOString();
  user.emailVerified = true;
  user.emailVerifiedAt = now;
  user.emailVerificationToken = undefined; // Clear token after use (one-time use)
  user.updatedAt = now;

  return user;
}

/**
 * Authenticate user with email and password
 * 
 * FLOW:
 * 1. Find user by email
 * 2. Verify password hash matches
 * 3. Check if email is verified (must verify before sign in)
 * 4. Update last login timestamp
 * 
 * MVP: Basic authentication
 * Production:
 *   - Add rate limiting to prevent brute force attacks
 *   - Implement account lockout after failed attempts
 *   - Add 2FA support for enhanced security
 *   - Log authentication attempts for security monitoring
 */
export function authenticateUser(email: string, password: string): User | null {
  const user = getUserByEmail(email);
  if (!user) {
    return null; // User not found
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    return null; // Invalid password
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw new Error("Email not verified. Please check your email for verification link.");
  }

  // Update last login timestamp
  user.lastLoginAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();

  return user;
}

/**
 * Create session for authenticated user
 * 
 * FLOW:
 * 1. Generate session token
 * 2. Calculate expiration time
 * 3. Store session in memory
 * 4. Clean up expired sessions
 * 
 * MVP: 
 *   - In-memory storage (lost on server restart)
 *   - 24 hour expiration
 *   - Simple cleanup on each creation
 * 
 * Production:
 *   - Store sessions in Redis (with TTL support)
 *   - Use JWT tokens (stateless, scalable)
 *   - Implement refresh tokens for longer sessions
 *   - Add device tracking for security
 *   - Support "remember me" with longer expiration
 */
export function createSession(userId: string, expiresInHours: number = 24): string {
  const sessionToken = generateToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
  
  sessions.set(sessionToken, { userId, expiresAt });
  
  // Clean up expired sessions periodically (simple cleanup)
  // MVP: Cleanup on each session creation (not efficient)
  // Production: Use Redis TTL or background job for cleanup
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (new Date(session.expiresAt).getTime() < now) {
      sessions.delete(token);
    }
  }
  
  return sessionToken;
}

/**
 * Get session by token
 * 
 * FLOW:
 * 1. Look up session by token
 * 2. Check if session exists
 * 3. Check if session is expired
 * 4. Delete if expired, return if valid
 * 
 * MVP: In-memory lookup
 * Production: Redis lookup with TTL
 */
export function getSession(sessionToken: string): { userId: string; expiresAt: string } | null {
  const session = sessions.get(sessionToken);
  if (!session) {
    return null; // Session not found
  }

  // Check if expired
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    sessions.delete(sessionToken); // Clean up expired session
    return null;
  }

  return session;
}

/**
 * Delete session (sign out)
 * 
 * MVP: Remove from in-memory map
 * Production: Delete from Redis
 */
export function deleteSession(sessionToken: string): void {
  sessions.delete(sessionToken);
}

/**
 * Get campus by ID
 * 
 * MVP: In-memory lookup
 * Production: Database query
 */
export function getCampusById(id: string): Campus | undefined {
  return campuses.find(c => c.id === id);
}

/**
 * Get all campuses
 * 
 * MVP: Return all in-memory campuses
 * Production: Database query with pagination
 */
export function getAllCampuses(): Campus[] {
  return [...campuses];
}

/**
/**
 * Legacy OCR helpers (deprecated in manual-entry flow).
 * These are intentionally commented out to avoid requesting license upload URLs.
 */
// function extractLicenseData(licenseUploadUrl?: string): {
//   licenseNumber?: string;
//   expirationDate?: string;
// } {
//   return {
//     licenseNumber: undefined,
//     expirationDate: undefined
//   };
// }

// function verifyLicenseName(legalName: string, licenseUploadUrl?: string): boolean {
//   if (!legalName || !legalName.trim()) {
//     return false;
//   }
//   return !!licenseUploadUrl;
// }

/**
 * Check if license is expired
 * 
 * Compares expiration date with current date.
 * License is expired if expiration date is before today (at 00:00).
 * 
 * @param licenseExpirationDate ISO date string (YYYY-MM-DD) or undefined
 * @returns true if license is expired, false if valid or no expiration date
 */
function isLicenseExpired(licenseExpirationDate?: string): boolean {
  if (!licenseExpirationDate) {
    // No expiration date - assume valid (MVP behavior)
    // Production: Require expiration date
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to 00:00:00
  
  const expiration = new Date(licenseExpirationDate);
  expiration.setHours(0, 0, 0, 0);
  
  // License is expired if expiration date is before today
  return expiration < today;
}

/**
 * Check if license expires within specified days
 * 
 * @param licenseExpirationDate ISO date string (YYYY-MM-DD) or undefined
 * @param days Number of days to check (e.g., 7 for 1 week, 3 for 3 days, 1 for 1 day)
 * @returns true if license expires within specified days
 */
function isLicenseExpiringWithin(licenseExpirationDate?: string, days: number = 7): boolean {
  if (!licenseExpirationDate) {
    return false; // No expiration date - can't determine
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiration = new Date(licenseExpirationDate);
  expiration.setHours(0, 0, 0, 0);
  
  // Calculate days until expiration
  const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Check if expiration is within specified days (and not already expired)
  return daysUntilExpiration >= 0 && daysUntilExpiration <= days;
}


/**
 * Get expiration status and alerts needed
 * 
 * Determines:
 * - If license is expired
 * - Reminder windows (1 week, 3 days, 1 day before expiration)
 * - Re-entry is always allowed; reminders only signal upcoming expiration
 * 
 * @param driverInfo Driver info with expiration date and alert tracking
 * @returns Object with expiration status and alerts needed
 */
export function getLicenseExpirationStatus(driverInfo?: {
  licenseExpirationDate?: string;
  expirationAlertsSent?: {
    oneWeek?: string;
    threeDays?: string;
    oneDay?: string;
  };
}): {
  isExpired: boolean;
  daysUntilExpiration: number | null;
  alertsNeeded: {
    oneWeek: boolean;
    threeDays: boolean;
    oneDay: boolean;
  };
} {
  if (!driverInfo || !driverInfo.licenseExpirationDate) {
    return {
      isExpired: false,
      daysUntilExpiration: null,
      alertsNeeded: {
        oneWeek: false,
        threeDays: false,
        oneDay: false
      }
    };
  }

  const expirationDate = driverInfo.licenseExpirationDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiration = new Date(expirationDate);
  expiration.setHours(0, 0, 0, 0);
  
  const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const isExpired = daysUntilExpiration < 0;
  
  // Determine which alerts need to be sent
  // Only send alerts if they haven't been sent yet
  const alertsSent = driverInfo.expirationAlertsSent || {};
  
  const alertsNeeded = {
    oneWeek: daysUntilExpiration <= 7 && daysUntilExpiration > 3 && !alertsSent.oneWeek,
    threeDays: daysUntilExpiration <= 3 && daysUntilExpiration > 1 && !alertsSent.threeDays,
    oneDay: daysUntilExpiration === 1 && !alertsSent.oneDay
  };

  return {
    isExpired,
    daysUntilExpiration: daysUntilExpiration < 0 ? null : daysUntilExpiration,
    alertsNeeded
  };
}

/**
 * Enable driver capability (first time)
 * 
 * FLOW:
 * 1. Check if user exists
 * 2. Check if user already has driver capability (prevent duplicates)
 * 3. Validate manual license details (state rules + expiration window)
 * 4. Create driverInfo with verification timestamps
 * 5. Enable driver availability
 * 
 * This is used when:
 * - User didn't sign up as driver initially but wants to enable it later
 * - User can re-enter license details at any time; expiration still blocks driving
 * 
 * MVP: Basic manual-entry validation
 * Production: Validate details against authoritative sources
 */
export function enableDriverCapability(
  userId: string,
  legalName: string,
  licenseNumber: string,
  licenseExpirationDate: string,
  issuingState: string
): User | null {
  const user = getUserById(userId);
  if (!user) {
    return null;
  }

  // Check if user already has driver capability
  if (user.driverInfo) {
    throw new Error("User already has driver capability enabled");
  }

  // Validate manual license details with shared rules.
  const licenseErrors = validateDriverLicenseInput({
    legalName,
    licenseNumber,
    licenseExpirationDate,
    issuingState
  });

  if (Object.keys(licenseErrors).length > 0) {
    const firstError = Object.values(licenseErrors)[0];
    throw new Error(firstError);
  }

  const normalizedExpiration = normalizeExpirationDate(licenseExpirationDate);
  
  // Create driver info with verification timestamps
  const now = new Date().toISOString();
  user.driverInfo = {
    legalName: legalName.trim(),
    // Manual entry: store validated license details.
    licenseNumber: licenseNumber.trim(),
    issuingState: isValidIssuingState(issuingState) ? issuingState : undefined,
    licenseExpirationDate: normalizedExpiration,
    // licenseUploadUrl, // Deprecated: manual entry replaces license upload URL.
    verified: true,
    verifiedAt: now, // First verification timestamp
    lastVerifiedAt: now, // Last verification timestamp (same as first for initial enable)
    expirationAlertsSent: {} // Initialize alert tracking - no alerts sent yet
  };
  user.isDriverAvailable = true; // Enable availability when first enabling capability
  user.updatedAt = now;

  return user;
}

/**
 * Update stored driver license details for an existing driver.
 *
 * FLOW:
 * 1. Check if user exists and already has driver capability
 * 2. Validate manual license details (state rules + expiration window)
 * 3. Update stored driverInfo with new license details
 * 4. Update verification timestamps
 */
export function updateDriverLicenseDetails(
  userId: string,
  legalName: string,
  licenseNumber: string,
  licenseExpirationDate: string,
  issuingState: string
): User | null {
  const user = getUserById(userId);
  if (!user || !user.driverInfo) {
    return null;
  }

  // Validate manual license details with shared rules.
  const licenseErrors = validateDriverLicenseInput({
    legalName,
    licenseNumber,
    licenseExpirationDate,
    issuingState
  });

  if (Object.keys(licenseErrors).length > 0) {
    const firstError = Object.values(licenseErrors)[0];
    throw new Error(firstError);
  }

  const normalizedExpiration = normalizeExpirationDate(licenseExpirationDate);

  // Update driver info using shared helper to reset expiration alerts and timestamps.
  user.driverInfo = updateLicenseDetails(
    {
      ...user.driverInfo,
      legalName: legalName.trim(),
      issuingState: isValidIssuingState(issuingState) ? issuingState : undefined
    },
    licenseNumber.trim(),
    normalizedExpiration as string,
    isValidIssuingState(issuingState) ? issuingState : undefined
  );

  user.updatedAt = new Date().toISOString();
  return user;
}

/**
 * Verify stored license is still valid (for subsequent toggles)
 * 
 * FLOW:
 * 1. Check if user has driver capability
 * 2. Ensure license expiration date has not passed
 * 3. Update lastVerifiedAt timestamp
 * 
 * This is called automatically when user toggles driver availability ON.
 * 
 * MVP:
 *   - Validates license based on expiration date only
 * 
 * Production:
 *   - Verify license hasn't been revoked (check against DMV database if available)
 *   - May prompt periodic license re-entry or review (e.g., every 6 months)
 *   - Could prompt user to confirm license is still valid
 */
export function verifyStoredLicense(userId: string): User | null {
  const user = getUserById(userId);
  if (!user || !user.driverInfo) {
    return null; // User doesn't have driver capability
  }

  // Guard: only verify if the stored expiration date has not passed.
  // Returning null lets callers block availability or require re-entry.
  if (isLicenseExpired(user.driverInfo.licenseExpirationDate)) {
    return null;
  }

  // MVP: Update verification timestamp for a still-valid license.
  // Production: Add additional validation checks (revocation, jurisdiction rules, etc.).
  const now = new Date().toISOString();
  user.driverInfo.lastVerifiedAt = now;
  user.updatedAt = now;

  return user;
}

/**
 * Update user driver availability (toggle on/off)
 * 
 * FLOW:
 * 1. Check if user exists
 * 2. If toggling ON:
 *    a. Check if user has driver capability (driverInfo exists)
 *    b. If no capability: throw error (must enable first)
 *    c. Verify stored license is still valid (expiration not passed)
 *    d. If expired: throw error (must re-enter license details)
 * 3. Update isDriverAvailable flag
 * 
 * KEY BEHAVIOR:
 * - Toggling ON:
 *   - Verifies stored license (disabled at 00:00 on expiration day)
 *   - Automatically updates verification timestamp when unexpired
 * - Toggling OFF: Simply disables availability
 * - First-time enable: Must use enableDriverCapability() first
 * 
 * LICENSE EXPIRATION:
 * - Driver toggle is disabled at 00:00 on expiration day
 * - User must re-enter license details to re-enable
 * - License details can be re-entered at any time; reminders happen near expiration
 * 
 * MVP: Basic toggle with automatic license verification
 * Production: 
 *   - May add confirmation dialog when toggling ON
 *   - Track availability history for analytics
 */
export function updateDriverAvailability(userId: string, isAvailable: boolean): User | null {
  const user = getUserById(userId);
  if (!user) {
    return null;
  }

  // If toggling ON, check if user has driver capability
  if (isAvailable && !user.driverInfo) {
    throw new Error("Driver capability not enabled. Please enable driver capability first by verifying your license details.");
  }

  // If toggling ON and user has driver capability, verify stored license status.
  if (isAvailable && user.driverInfo) {
    // Verify stored license; null means expired and should block availability.
    const verifiedUser = verifyStoredLicense(userId);
    if (!verifiedUser) {
      throw new Error("Your driver's license has expired. Please re-enter your license details to continue driving.");
    }
  }

  // Update availability flag
  user.isDriverAvailable = isAvailable;
  user.updatedAt = new Date().toISOString();

  return user;
}
