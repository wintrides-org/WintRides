/* 
This file defines the types and interfaces for user authentication and profiles in the WintRides application.

ARCHITECTURE NOTES:
- Everyone is a rider by default
- Driver is an optional add-on capability (determined by presence of driverInfo)
- Users can toggle driver availability day-to-day without re-uploading license
- License upload only required on first-time driver registration
- For production, automatically disable driver capability once lincense is expired and ask for a re-upload
*/

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
 * MVP: License verification is basic (just checks that license is uploaded)
 * Production: 
 *   - Use OCR to extract name from license image
 *   - Verify name matches legalName with fuzzy matching
 *   - Extract and store license expiration date
 *   - Periodically check if license is still valid
 *   - Store license in secure cloud storage (S3, Cloudinary) with encryption
 * 
 * LICENSE EXPIRATION TRACKING:
 * - Expiration date is extracted from license via OCR (production)
 * - License upload field becomes editable 1 week before expiration
 * - Alerts sent: 1 week before, 3 days before, 1 day before expiration
 * - Driver toggle disabled at 00:00 on expiration day until new license uploaded
 * - Each new license upload stores new expiration date and restarts tracking
 */
export interface DriverInfo {
  legalName: string; // Full legal name as it appears on license
  licenseNumber?: string; // Unique license identifier printed on the license (e.g., "D1234567", "123456789")
                          // Format varies by jurisdiction (state/country)
                          // Optional field - not required for MVP
                          // Production: Extract via OCR for verification and record-keeping
  licenseUploadUrl?: string; // MVP: base64 data URL. Production: URL to cloud storage (S3, Cloudinary)
  expirationDate?: string; // ISO date string (YYYY-MM-DD) - License expiration date, extracted via OCR in production
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
 * MVP: In-memory storage
 * Production: This maps to database schema (PostgreSQL, MongoDB, etc.)
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
 * MVP: License file is converted to base64 data URL on client
 * Production: Upload license to cloud storage first, then send URL
 */
export interface RegisterRequest {
  email: string;
  password: string;
  wantsToDrive?: boolean; // If true, legalName and licenseFile are required
  legalName?: string; // Required if wantsToDrive is true
  licenseFile?: File; // MVP: base64. Production: upload to S3/Cloudinary first
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
