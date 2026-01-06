/**
 * License Expiration Management
 * 
 * Handles license expiration tracking, alerts, and re-upload logic.
 * 
 * LICENSE EXPIRATION FLOW:
 * 1. Expiration date extracted from license via OCR (production)
 * 2. License upload field becomes editable 1 week before expiration
 * 3. Alerts sent: 1 week before, 3 days before, 1 day before expiration
 * 4. Driver toggle disabled at 00:00 on expiration day
 * 5. User must upload new license to re-enable
 * 6. New upload stores new expiration date and restarts tracking
 * 
 * MVP: Basic expiration checking
 * Production: 
 *   - Automated email/SMS alerts
 *   - Background job to check expirations daily
 *   - Automatic disabling at expiration
 */

import type { DriverInfo } from "@/types/user";

/**
 * Update license with new upload
 * 
 * Called when user uploads a new license (either initial upload or renewal).
 * Extracts expiration date from new license and resets alert tracking.
 * 
 * FLOW:
 * 1. Extract license data (number, expiration) via OCR
 * 2. Update driverInfo with new license data
 * 3. Reset expiration alert tracking (new license = new tracking cycle)
 * 4. Update verification timestamps
 * 
 * @param driverInfo Current driver info
 * @param licenseUploadUrl URL to new license upload
 * @returns Updated driver info with new expiration date and reset alerts
 */
export function updateLicenseUpload(
  driverInfo: DriverInfo,
  licenseUploadUrl: string
): DriverInfo {
  // Extract license data (license number, expiration date) via OCR
  // MVP: No OCR - expirationDate will be undefined
  // Production: Extract via OCR service (AWS Textract, Google Vision, etc.)
  // This is a placeholder - actual OCR extraction would happen in the API route
  const licenseData = {
    licenseNumber: undefined, // Extracted via OCR (production)
    expirationDate: undefined // Extracted via OCR (production) - ISO date string (YYYY-MM-DD)
  };
  
  const now = new Date().toISOString();
  
  // Update driver info with new license
  return {
    ...driverInfo,
    licenseNumber: licenseData.licenseNumber || driverInfo.licenseNumber, // Keep existing if not extracted
    licenseUploadUrl,
    expirationDate: licenseData.expirationDate, // New expiration date from new license
    verified: true,
    verifiedAt: driverInfo.verifiedAt || now, // Keep original verification date
    lastVerifiedAt: now, // Update last verification timestamp
    expirationAlertsSent: {} // Reset alert tracking - new license = new tracking cycle
  };
}

/**
 * Mark expiration alert as sent
 * 
 * Records that a specific expiration alert has been sent to prevent duplicate alerts.
 * 
 * @param driverInfo Current driver info
 * @param alertType Type of alert sent ("oneWeek", "threeDays", "oneDay")
 * @returns Updated driver info with alert marked as sent
 */
export function markExpirationAlertSent(
  driverInfo: DriverInfo,
  alertType: "oneWeek" | "threeDays" | "oneDay"
): DriverInfo {
  const now = new Date().toISOString();
  
  return {
    ...driverInfo,
    expirationAlertsSent: {
      ...driverInfo.expirationAlertsSent,
      [alertType]: now // Mark this alert type as sent with current timestamp
    }
  };
}

/**
 * Check if license upload field should be editable
 * 
 * License upload field becomes editable 1 week before expiration.
 * This allows users to upload a new license before the current one expires.
 * 
 * @param expirationDate ISO date string (YYYY-MM-DD) or undefined
 * @returns true if license can be re-uploaded (1 week or less until expiration)
 */
export function shouldAllowLicenseReupload(expirationDate?: string): boolean {
  if (!expirationDate) {
    // No expiration date - allow re-upload (MVP behavior)
    // Production: Require expiration date
    return true;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiration = new Date(expirationDate);
  expiration.setHours(0, 0, 0, 0);
  
  // Calculate days until expiration
  const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Allow re-upload if expiration is within 1 week (7 days) or already expired
  return daysUntilExpiration <= 7;
}

