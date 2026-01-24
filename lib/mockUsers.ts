/*
* This file was initially created as a mock in-memory placeholder before the data base was implemented, hence the name
* It has now been updated to read from and write to the database where necessary 
*/

import bcrypt from "bcrypt"; // Allows for password hashing and verification.
import crypto from "crypto"; // Crypto generates secure random vales for verification/session tokens
import type { DriverInfo } from "@/types/user"; // Shared type for driver license records.
import {
  isValidIssuingState,
  normalizeExpirationDate,
  validateDriverLicenseInput
} from "@/lib/licenseValidation"; // License input validation and normalization helpers.
import { updateLicenseDetails } from "@/lib/licenseExpiration"; // Logic for alerts to update license details
import { prisma } from "@/lib/prisma"; // Prisma client for database access.
import type { Prisma } from "@prisma/client"; // Prisma type helpers for payload typing.
import { normalizeUserName } from "@/lib/usernameValidation";

const SALT_ROUNDS = 10; // Number of bcrypt salt rounds for password hashing.
// Read allowed domains from env (or default), normalize, and keep an allowlist array.
const allowedCampusDomains = (process.env.ALLOWED_CAMPUS_DOMAINS ?? "smith.edu") // Read allowed domains or default to Smith.
  .split(",") // Split comma-separated domains into an array.
  .map(domain => domain.trim().toLowerCase()) // Normalize whitespace and casing.
  .filter(Boolean); // Remove any empty entries.

type UserWithDriverInfo = Prisma.UserGetPayload<{ include: { driverInfo: true } }>;

/**
 * Generate a random session/verification token.
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate a candidate username from an email address.
 */
function buildUserNameFromEmail(email: string): string { // Build a username base from the email.
  const localPart = email.split("@")[0] ?? ""; // Use the local part before the @ symbol.
  const cleaned = localPart.replace(/[^a-zA-Z0-9]+/g, ""); // Remove non-alphanumeric characters.
  const fallback = cleaned || "rider"; // Provide a fallback if nothing remains.
  return normalizeUserName(fallback); // Normalize to your username rules.
}

/**
 * Ensure a username is unique by checking existing users.
 */
async function generateUniqueUserName(email: string): Promise<string> { // Build a unique username for Google users.
  const base = buildUserNameFromEmail(email); // Start from the email local part.
  let candidate = base; // Initialize the candidate with the base username.
  let attempt = 0; // Track how many suffix attempts have been made.

  while (await getUserByUserName(candidate)) { // Loop until an unused username is found.
    attempt += 1; // Increment the attempt counter.
    const suffix = crypto.randomBytes(2).toString("hex"); // Generate a short random suffix.
    candidate = normalizeUserName(`${base}${suffix}`); // Append suffix and normalize again.
    if (attempt > 10) { // Avoid an infinite loop in the unlikely case of collisions.
      candidate = normalizeUserName(`${base}${Date.now().toString().slice(-4)}`); // Fallback to a time-based suffix.
    }
  }

  return candidate; // Return the unique username.
}

/**
 * Extract the domain portion of an email address.
 * Throws if the email is malformed.
 */
function getEmailDomain(email: string): string { // Extract the email domain.
  const domain = email.split("@")[1]?.toLowerCase(); // Split at "@" and normalize.
  if (!domain) { // Guard against malformed emails.
    throw new Error("Invalid email format"); // Surface a clear validation error.
  }
  return domain; // Return the domain portion.
}

/**
 * Pure allowlist check for a domain string
 * Checks if an email domain is in the allowed campus list.
 */
function isAllowedCampusDomain(domain: string): boolean { // Check if domain is in allowlist.
  return allowedCampusDomains.includes(domain); // Return true only for configured domains.
}

/**
 * Validate that an email belongs to an allowed campus domain.
 * Extracts the domain from an email and then calls the allowlist check.
 */
function isValidCampusEmail(email: string): boolean { // Validate email against campus allowlist.
  const domain = getEmailDomain(email); // Derive the domain from the email.
  return isAllowedCampusDomain(domain); // Allow only configured campus domains.
}

/**
 * Validates the email’s domain (using the same allowlist logic)
 * Then fetches or creates a campus record in the database.
 * Adds persistence and database lookups on top of validation.
 */
async function getCampusFromEmail(email: string) { // Resolve a campus record for the email domain.
  const domain = getEmailDomain(email); // Extract the email domain.
  if (!isAllowedCampusDomain(domain)) { // Block domains outside the allowlist.
    throw new Error("Invalid email domain. WintRides is yet to arrive at your campus!"); // Explain why registration fails.
  }

  const existing = await prisma.campus.findUnique({ where: { emailDomain: domain } }); // Look up campus by domain.
  if (existing) { // If already configured, reuse it.
    return existing; // Return the existing campus record.
  }

  const campusName = domain // Derive a friendly campus name from the domain.
    .split(".")[0] // Take the first label (e.g., "smith").
    .split("-") // Split on hyphens for multi-word names.
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word.
    .join(" "); // Join words with spaces.

  return prisma.campus.create({ // Create a campus entry for this allowed domain.
    data: {
      name: `${campusName} Campus`, // Use derived name for display.
      emailDomain: domain // Store the domain for future lookups.
    }
  });
}

/**
 * Fetch a user by ID, including their driver info.
 */
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { driverInfo: true }
  });
}


// returns full user record of the user with userName
// the 'include' keyword here says "Also include the driverInfo of the user (if they have one) in the record"
export async function getUserByUserName(userName: string) {
  return prisma.user.findUnique({
    where: { userName: userName.toLowerCase() },
    include: { driverInfo: true }
  });
}

/**
 * Fetch a user by email (case-insensitive), including driver info.
 */
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { driverInfo: true }
  });
}

/**
 * Create a new user and (optionally) persist driver license details.
 * Returns the created user and an email verification token.
 */
export async function createUser(data: {
  userName: string;
  email: string;
  password: string;
  wantsToDrive?: boolean;
  legalName?: string;
  licenseNumber?: string;
  licenseExpirationDate?: string;
  issuingState?: string;
}): Promise<{ user: any; verificationToken: string }> {
  if (!isValidCampusEmail(data.email)) {
    throw new Error("Email must be from an allowed campus domain");
  }

  const email = data.email.toLowerCase();
  const userName = normalizeUserName(data.userName);
  // Enforce uniqueness at the application level before attempting a create.
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error("User with this email already exists");
  }

  const campus = await getCampusFromEmail(email);
  const now = new Date();
  const verificationToken = generateToken();

  // Determine whether the request includes any driver-related fields.
  const hasDriverDetails =
    data.legalName || data.licenseNumber || data.licenseExpirationDate || data.issuingState;

  let driverInfoData:
    | {
        legalName: string;
        licenseNumber?: string | null;
        issuingState?: string | null;
        licenseExpirationDate?: string | null;
        verified: boolean;
        verifiedAt: Date;
        lastVerifiedAt: Date;
        expirationAlertsSent: object;
      }
    | undefined;

  if (hasDriverDetails) {
    // Validate the driver input as a cohesive set before persisting anything.
    const licenseErrors = validateDriverLicenseInput({
      legalName: data.legalName,
      licenseNumber: data.licenseNumber,
      licenseExpirationDate: data.licenseExpirationDate,
      issuingState: data.issuingState
    });

    if (Object.keys(licenseErrors).length > 0) {
      const firstError = Object.values(licenseErrors)[0];
      throw new Error(firstError);
    }

    const normalizedExpiration = normalizeExpirationDate(data.licenseExpirationDate);

    // Build driver info with normalized, trimmed inputs.
    driverInfoData = {
      legalName: data.legalName?.trim() || "",
      licenseNumber: data.licenseNumber?.trim() || null,
      issuingState: isValidIssuingState(data.issuingState) ? data.issuingState : null,
      licenseExpirationDate: normalizedExpiration || null,
      verified: true,
      verifiedAt: now,
      lastVerifiedAt: now,
      expirationAlertsSent: {}
    };
  }

  // Hash the password before storing.
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      userName,
      passwordHash,
      campusId: campus.id,
      isDriverAvailable: Boolean(driverInfoData),
      emailVerified: false,
      emailVerificationToken: verificationToken,
      ridesCompleted: 0,
      noShowCount: 0,
      // If driver details were supplied, create the related row in the same transaction.
      driverInfo: driverInfoData ? { create: driverInfoData } : undefined
    },
    include: { driverInfo: true }
  });

  return { user, verificationToken };
}

/**
 * Verify a user's email using a verification token.
 * Returns the updated user or null if the token is invalid.
 */
export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token },
    include: { driverInfo: true }
  });

  if (!user) {
    return null;
  }

  const now = new Date();
  return prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: now,
      emailVerificationToken: null
    },
    include: { driverInfo: true }
  });
}

/**
 * Authenticate a user with email + password.
 * Returns the updated user with login metadata, or null for invalid credentials.
 */
export async function authenticateUser(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  if (!user.passwordHash) { // Prevent password sign-in for Google-only accounts.
    return null; // Treat as invalid credentials for this flow.
  }

  // Compare the provided password against the stored hash.
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  if (!user.emailVerified) {
    throw new Error("Email not verified. Please check your email for verification link.");
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    include: { driverInfo: true }
  });
}

/**
 * Find a user by Google-authenticated email or create them if missing.
 * Marks the account as verified and updates login metadata.
 * (auth/google/route.ts imports and uses findOrCreateGoogleUser after verifying a Google ID token.)
 */
export async function findOrCreateGoogleUser(email: string): Promise<UserWithDriverInfo> { // Find or create a user from Google sign-in.
  const normalizedEmail = email.trim().toLowerCase(); // Normalize the email for lookup and storage.
  if (!isValidCampusEmail(normalizedEmail)) { // Enforce the campus allowlist.
    throw new Error("Oops! Wintirdes is not yet on your campus."); // Explain why sign-in fails.
  }

  const existing = await getUserByEmail(normalizedEmail); // Look up an existing account by email.
  if (existing) { // If the user already exists, update their verification/login metadata.
    const now = new Date(); // Capture the login time.
    return prisma.user.update({ // Update verification state and login timestamp.
      where: { id: existing.id }, // Match the existing user by ID.
      data: { // Persist updated fields.
        emailVerified: true, // Mark email as verified via Google.
        emailVerifiedAt: existing.emailVerifiedAt ?? now, // Preserve prior verification time if it exists.
        emailVerificationToken: null, // Clear any pending verification token.
        lastLoginAt: now // Record the latest login timestamp.
      },
      include: { driverInfo: true } // Keep driver info in the response.
    });
  }

  const campus = await getCampusFromEmail(normalizedEmail); // Resolve campus from the email domain.
  const now = new Date(); // Use a consistent timestamp for creation fields.
  const userName = await generateUniqueUserName(normalizedEmail); // Generate a unique username for the new user.

  return prisma.user.create({ // Create a new Google-authenticated user.
    data: { // Populate user fields for Google sign-in.
      email: normalizedEmail, // Store the normalized email.
      userName, // Store the generated unique username.
      passwordHash: undefined, // Omit password for Google-only accounts (nullable column).
      campusId: campus.id, // Assign the resolved campus.
      isDriverAvailable: false, // Default driver availability to false.
      emailVerified: true, // Mark email verified via Google.
      emailVerifiedAt: now, // Record verification time.
      emailVerificationToken: null, // Ensure no verification token remains.
      ridesCompleted: 0, // Initialize rides completed count.
      noShowCount: 0, // Initialize no-show count.
      lastLoginAt: now // Record the initial login time.
    },
    include: { driverInfo: true } // Keep driver info in the response.
  });
}

/**
 * Create a session token for a user with an expiration window (default 24h).
 */
export async function createSession(userId: string, expiresInHours: number = 24): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt
    }
  });

  return token;
}

/**
 * Fetch a session by token and prune it if expired.
 * Returns the session or null when missing/expired.
 */
export async function getSession(sessionToken: string) {
  const session = await prisma.session.findUnique({ where: { token: sessionToken } });
  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    // Clean up expired session records to avoid reuse.
    await prisma.session.delete({ where: { token: sessionToken } });
    return null;
  }

  return session;
}

/**
 * Remove a session token from persistence.
 */
export async function deleteSession(sessionToken: string): Promise<void> {
  await prisma.session.delete({ where: { token: sessionToken } });
}

/**
 * Fetch a campus by ID.
 */
export async function getCampusById(id: string) {
  return prisma.campus.findUnique({ where: { id } });
}

/**
 * List all campuses.
 */
export async function getAllCampuses() {
  return prisma.campus.findMany();
}

/**
 * Enable driver capability for a user by creating driver info.
 * Validates license data before persisting.
 */
export async function enableDriverCapability(
  userId: string,
  legalName: string,
  licenseNumber: string,
  licenseExpirationDate: string,
  issuingState: string
) {
  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  if (user.driverInfo) {
    throw new Error("User already has driver capability enabled");
  }

  // Validate the submitted license info as a cohesive set.
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
  const now = new Date();

  // Store the driver info and mark it as verified at creation time.
  await prisma.driverInfo.create({
    data: {
      userId,
      legalName: legalName.trim(),
      licenseNumber: licenseNumber.trim(),
      issuingState: isValidIssuingState(issuingState) ? issuingState : null,
      licenseExpirationDate: normalizedExpiration || null,
      verified: true,
      verifiedAt: now,
      lastVerifiedAt: now,
      expirationAlertsSent: {}
    }
  });

  // Flip driver availability once driver info exists.
  return prisma.user.update({
    where: { id: userId },
    data: { isDriverAvailable: true },
    include: { driverInfo: true }
  });
}

/**
 * Update a user's stored driver license details and verification metadata.
 */
export async function updateDriverLicenseDetails(
  userId: string,
  legalName: string,
  licenseNumber: string,
  licenseExpirationDate: string,
  issuingState: string
) {
  const user = await getUserById(userId);
  if (!user || !user.driverInfo) {
    return null;
  }

  // Validate the new license fields before applying updates.
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
  const normalizedState = isValidIssuingState(issuingState) ? issuingState : undefined;

  // Normalize the existing driver record into the DriverInfo shape required by updateLicenseDetails.
  const driverInfoForUpdate: DriverInfo = {
    legalName: legalName.trim(),
    licenseNumber: user.driverInfo.licenseNumber ?? undefined,
    issuingState: normalizedState,
    licenseExpirationDate: user.driverInfo.licenseExpirationDate ?? undefined,
    verified: user.driverInfo.verified,
    verifiedAt: user.driverInfo.verifiedAt ? user.driverInfo.verifiedAt.toISOString() : undefined,
    lastVerifiedAt: user.driverInfo.lastVerifiedAt ? user.driverInfo.lastVerifiedAt.toISOString() : undefined,
    expirationAlertsSent: (user.driverInfo.expirationAlertsSent ?? undefined) as DriverInfo["expirationAlertsSent"]
  };

  // Use shared license update logic to handle status transitions and timestamps.
  const updatedDriverInfo = updateLicenseDetails(
    driverInfoForUpdate,
    licenseNumber.trim(),
    normalizedExpiration as string,
    normalizedState
  );

  // Persist the merged driver info back to the database.
  await prisma.driverInfo.update({
    where: { userId },
    data: {
      legalName: updatedDriverInfo.legalName,
      licenseNumber: updatedDriverInfo.licenseNumber || null,
      issuingState: updatedDriverInfo.issuingState || null,
      licenseExpirationDate: updatedDriverInfo.licenseExpirationDate || null,
      verified: updatedDriverInfo.verified,
      verifiedAt: updatedDriverInfo.verifiedAt ? new Date(updatedDriverInfo.verifiedAt) : null,
      lastVerifiedAt: updatedDriverInfo.lastVerifiedAt ? new Date(updatedDriverInfo.lastVerifiedAt) : null,
      expirationAlertsSent: updatedDriverInfo.expirationAlertsSent || {}
    }
  });

  return prisma.user.findUnique({
    where: { id: userId },
    include: { driverInfo: true }
  });
}

/**
 * Re-verify an existing license (if not expired) and update the lastVerifiedAt timestamp.
 */
export async function verifyStoredLicense(userId: string) {
  const user = await getUserById(userId);
  if (!user || !user.driverInfo) {
    return null;
  }

  if (isLicenseExpired(user.driverInfo.licenseExpirationDate ?? undefined)) {
    return null;
  }

  const now = new Date();
  await prisma.driverInfo.update({
    where: { userId },
    data: { lastVerifiedAt: now }
  });

  return prisma.user.findUnique({
    where: { id: userId },
    include: { driverInfo: true }
  });
}

/**
 * Toggle driver availability while ensuring license state is still valid.
 */
export async function updateDriverAvailability(userId: string, isAvailable: boolean) {
  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  if (isAvailable && !user.driverInfo) {
    throw new Error("Driver capability not enabled. Please enable driver capability first by verifying your license details.");
  }

  if (isAvailable && user.driverInfo) {
    // Ensure the stored license has not expired before enabling availability.
    const verifiedUser = await verifyStoredLicense(userId);
    if (!verifiedUser) {
      throw new Error("Your driver's license has expired. Please re-enter your license details to continue driving.");
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: { isDriverAvailable: isAvailable },
    include: { driverInfo: true }
  });
}

/**
 * Determine whether a license expiration date has already passed.
 */
function isLicenseExpired(licenseExpirationDate?: string): boolean {
  if (!licenseExpirationDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiration = new Date(licenseExpirationDate);
  expiration.setHours(0, 0, 0, 0);

  return expiration < today;
}

/**
 * Check if a license will expire within a given number of days (default 7).
 */
function isLicenseExpiringWithin(licenseExpirationDate?: string, days: number = 7): boolean {
  if (!licenseExpirationDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiration = new Date(licenseExpirationDate);
  expiration.setHours(0, 0, 0, 0);

  const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiration >= 0 && daysUntilExpiration <= days;
}

/**
 * Compute license expiration status and which alerts should be sent.
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

  // Normalize dates to midnight so comparisons are day-accurate.
  const expirationDate = driverInfo.licenseExpirationDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiration = new Date(expirationDate);
  expiration.setHours(0, 0, 0, 0);

  const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysUntilExpiration < 0;

  const alertsSent = driverInfo.expirationAlertsSent || {};

  // Determine which alerts are due based on remaining days and prior sends.
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
