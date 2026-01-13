/* 
This file defines the types and interfaces for user authentication and profiles in the WintRides application.

ARCHITECTURE NOTES:
- Everyone is a rider by default
- Driver is an optional add-on capability (determined by presence of driverInfo)
- Users can toggle driver availability day-to-day without updating license info
- Manual license entry is required on first-time driver registration
- For production, automatically disable driver capability once license is expired and require re-entry before driving
*/

import type { USStateCode } from "@/lib/licenseValidation";

// User verification status (for future use - e.g., admin verification of drivers)
export type VerificationStatus = "pending" | "verified" | "rejected";

/**
 * Campus assignment (derived from email domain)
 * 
 * MVP: Campuses are auto-created based on email domain
 * Production: Campuses should be pre-configured in database with proper names,
 *             settings, and admin assignments
 */
export interface Campus {
  id: string;
  name: string;
  emailDomain: string; // e.g., "myuniversity.edu"
}

/**
 * Driver-specific information
 * 
 * This is only present if the user has driver capability enabled.
 * 
 * MVP: License verification is basic (manual entry validation only)
 * Production: 
 *   - Verify name matches legalName with fuzzy matching
 *   - Periodically check if license is still valid
 * 
 * LICENSE EXPIRATION TRACKING:
 * - Expiration date is provided by the user and validated on entry
 * - Alerts sent: 1 week before, 3 days before, 1 day before expiration
 * - Driver toggle disabled at 00:00 on expiration day until license details are re-entered
 * - Each re-entry stores a new expiration date and restarts tracking
 */
export interface DriverInfo {
  legalName: string; // Full legal name as it appears on license
  // License number as entered by the user (validated per issuing state rules).
  licenseNumber?: string;
  // State that issued the license; must be a valid US state or DC.
  issuingState?: USStateCode;
  // ISO date string (YYYY-MM-DD) for license expiration.
  licenseExpirationDate?: string;
  // licenseUploadUrl?: string; // Deprecated: manual entry replaces license upload URL.
  verified: boolean; // Whether license has been verified
  verifiedAt?: string; // ISO timestamp when license was first verified (during initial upload)
  lastVerifiedAt?: string; // ISO timestamp when license was last verified (during subsequent toggles)
  expirationAlertsSent?: {
    oneWeek?: string; // ISO timestamp when 1-week alert was sent
    threeDays?: string; // ISO timestamp when 3-day alert was sent
    oneDay?: string; // ISO timestamp when 1-day alert was sent
  };
}

/**
 * Main user interface
 * 
 * This maps to database schema (PostgreSQL)
 */
export interface User {
  id: string; // Unique user identifier
  email: string; // Campus email (must be .edu, .ac.uk, or .edu.au)
  passwordHash: string; // MVP: SHA-256 hash. Production: bcrypt hash (never store plain text)
  campusId: string; // Assigned campus based on email domain (permanent assignment)
  
  // Identity
  pseudonym: string; // Public display name (auto-generated, shown in public chats)
  realName?: string; // Only revealed in confirmed rides (for trust/safety)
  
  // Capabilities
  // Everyone is a rider by default. Driver is an optional add-on capability.
  isDriverAvailable: boolean; // Day-to-day toggle for driver availability
  
  // Driver-specific (only if user has driver capability)
  // If driverInfo exists, user has driver capability
  // If driverInfo is undefined, user is rider-only
  driverInfo?: DriverInfo;
  
  // Verification
  emailVerified: boolean; // Whether email has been verified via verification link
  emailVerifiedAt?: string; // ISO timestamp when email was verified
  emailVerificationToken?: string; // One-time token for email verification (cleared after use)
  
  // Timestamps
  createdAt: string; // ISO timestamp when account was created
  updatedAt: string; // ISO timestamp when account was last updated
  lastLoginAt?: string; // ISO timestamp of last successful login
  
  // Reliability indicators (for MVP+)
  ridesCompleted?: number; // Total rides completed (for trust indicators)
  noShowCount?: number; // Number of no-shows (for reliability tracking)
  rating?: number; // Average rating (for trust indicators)
}

/**
 * Registration request payload
 * 
 * MVP: Manual license details are entered in the dedicated driver form
 * Production: Validate details against authoritative sources where possible
 */
export interface RegisterRequest {
  email: string;
  password: string;
  wantsToDrive?: boolean; // If true, capture intent and redirect to driver form after signup
  legalName?: string; // Optional: only used if registering as a driver immediately
  licenseNumber?: string; // Optional: only used if registering as a driver immediately
  licenseExpirationDate?: string; // Optional: only used if registering as a driver immediately (YYYY-MM-DD)
  issuingState?: USStateCode; // Optional: only used if registering as a driver immediately
}

/**
 * Sign in request payload
 */
export interface SignInRequest {
  email: string;
  password: string;
}

/**
 * Session information
 * 
 * MVP: Sessions stored in-memory (lost on server restart)
 * Production: Store sessions in Redis or database with proper expiration
 */
export interface Session {
  userId: string;
  email: string;
  pseudonym: string;
  campusId: string;
  isDriver: boolean; // Whether user has driver capability (computed from driverInfo existence)
  expiresAt: string; // ISO timestamp when session expires
}
