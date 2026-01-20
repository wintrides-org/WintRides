import bcrypt from "bcrypt";
import crypto from "crypto";
import type { DriverInfo } from "@/types/user";
import {
  isValidIssuingState,
  normalizeExpirationDate,
  validateDriverLicenseInput
} from "@/lib/licenseValidation";
import { updateLicenseDetails } from "@/lib/licenseExpiration";
import { prisma } from "@/lib/prisma";

const SALT_ROUNDS = 10; // Number of bcrypt salt rounds for password hashing.
const allowedCampusDomains = (process.env.ALLOWED_CAMPUS_DOMAINS ?? "smith.edu") // Read allowed domains or default to Smith.
  .split(",") // Split comma-separated domains into an array.
  .map(domain => domain.trim().toLowerCase()) // Normalize whitespace and casing.
  .filter(Boolean); // Remove any empty entries.

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generatePseudonym(): string {
  const adjectives = ["Swift", "Bold", "Calm", "Bright", "Quick", "Wise", "Brave", "Kind"];
  const nouns = ["Rider", "Traveler", "Explorer", "Pilot", "Navigator", "Wanderer"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}

function getEmailDomain(email: string): string { // Extract the email domain.
  const domain = email.split("@")[1]?.toLowerCase(); // Split at "@" and normalize.
  if (!domain) { // Guard against malformed emails.
    throw new Error("Invalid email format"); // Surface a clear validation error.
  }
  return domain; // Return the domain portion.
}

function isAllowedCampusDomain(domain: string): boolean { // Check if domain is in allowlist.
  return allowedCampusDomains.includes(domain); // Return true only for configured domains.
}

function isValidCampusEmail(email: string): boolean { // Validate email against campus allowlist.
  const domain = getEmailDomain(email); // Derive the domain from the email.
  return isAllowedCampusDomain(domain); // Allow only configured campus domains.
}

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

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { driverInfo: true }
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { driverInfo: true }
  });
}

export async function createUser(data: {
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
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error("User with this email already exists");
  }

  const campus = await getCampusFromEmail(email);
  const now = new Date();
  const verificationToken = generateToken();
  const pseudonym = generatePseudonym();

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

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      campusId: campus.id,
      pseudonym,
      isDriverAvailable: Boolean(driverInfoData),
      emailVerified: false,
      emailVerificationToken: verificationToken,
      ridesCompleted: 0,
      noShowCount: 0,
      driverInfo: driverInfoData ? { create: driverInfoData } : undefined
    },
    include: { driverInfo: true }
  });

  return { user, verificationToken };
}

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

export async function authenticateUser(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  if (!user.passwordHash) { // Prevent password sign-in for Google-only accounts.
    return null; // Treat as invalid credentials for this flow.
  }

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

export async function findOrCreateGoogleUser(email: string) { // Find or create a user from Google sign-in.
  const normalizedEmail = email.trim().toLowerCase(); // Normalize the email for lookup and storage.
  if (!isValidCampusEmail(normalizedEmail)) { // Enforce the campus allowlist.
    throw new Error("Email must be from an allowed campus domain"); // Explain why sign-in fails.
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
  const pseudonym = generatePseudonym(); // Generate a display pseudonym for the user.

  return prisma.user.create({ // Create a new Google-authenticated user.
    data: { // Populate user fields for Google sign-in.
      email: normalizedEmail, // Store the normalized email.
      passwordHash: undefined, // Omit password for Google-only accounts (nullable column).
      campusId: campus.id, // Assign the resolved campus.
      pseudonym, // Store the generated pseudonym.
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

export async function getSession(sessionToken: string) {
  const session = await prisma.session.findUnique({ where: { token: sessionToken } });
  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { token: sessionToken } });
    return null;
  }

  return session;
}

export async function deleteSession(sessionToken: string): Promise<void> {
  await prisma.session.delete({ where: { token: sessionToken } });
}

export async function getCampusById(id: string) {
  return prisma.campus.findUnique({ where: { id } });
}

export async function getAllCampuses() {
  return prisma.campus.findMany();
}

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

  return prisma.user.update({
    where: { id: userId },
    data: { isDriverAvailable: true },
    include: { driverInfo: true }
  });
}

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

  const updatedDriverInfo = updateLicenseDetails(
    driverInfoForUpdate,
    licenseNumber.trim(),
    normalizedExpiration as string,
    normalizedState
  );

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

export async function updateDriverAvailability(userId: string, isAvailable: boolean) {
  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  if (isAvailable && !user.driverInfo) {
    throw new Error("Driver capability not enabled. Please enable driver capability first by verifying your license details.");
  }

  if (isAvailable && user.driverInfo) {
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
