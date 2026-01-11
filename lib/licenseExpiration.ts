/**
 * License Expiration Management
 * 
 * Handles license expiration tracking, alerts, and manual re-entry logic.
 * 
 * LICENSE EXPIRATION FLOW:
 * 1. Expiration date provided by the user during manual entry (MVP)
 * 2. License details can be re-entered at any time
 * 3. Alerts sent: 1 week before, 3 days before, 1 day before expiration
 * 4. Driver toggle disabled at 00:00 on expiration day
 * 5. User must re-enter license details to re-enable
 * 6. Each re-entry stores a new expiration date and restarts tracking
 * 
 * MVP: Basic expiration checking
 * Production: 
 *   - Automated dashboard+email alerts
 *   - Background job to check expirations daily
 *   - Automatic disabling at expiration
 */

import type { DriverInfo } from "@/types/user";

/**
 * Update license details after manual re-entry
 * 
 * Called when user re-enters license details (either initial entry or renewal).
 * Stores the new expiration date and resets alert tracking.
 * 
 * FLOW:
 * 1. Validate license data before calling this helper
 * 2. Update driverInfo with the new license data
 * 3. Reset expiration alert tracking (new re-entry = new tracking cycle)
 * 4. Update verification timestamps
 * 
 * @param driverInfo Current driver info
 * @param licenseNumber License number entered by the driver
 * @param licenseExpirationDate ISO date string (YYYY-MM-DD)
 * @param issuingState US state or DC code
 * @returns Updated driver info with new expiration date and reset alerts
 */
export function updateLicenseDetails(
  driverInfo: DriverInfo,
  licenseNumber: string,
  licenseExpirationDate: string,
  issuingState: DriverInfo["issuingState"]
): DriverInfo {
  // Note: Validation happens before calling this function to keep it lightweight.
  const now = new Date().toISOString();

  return {
    ...driverInfo,
    licenseNumber,
    issuingState,
    licenseExpirationDate,
    // licenseUploadUrl, // Deprecated: manual entry replaces license upload URL.
    verified: true,
    verifiedAt: driverInfo.verifiedAt || now, // Preserve original verification date
    lastVerifiedAt: now, // Update last verification timestamp
    expirationAlertsSent: {} // Reset alert tracking - new re-entry = new tracking cycle
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
 * Check if the expiration reminder window applies
 * 
 * License details can be re-entered at any time; this helper only defines the
 * reminder window (1 week before expiration).
 * 
 * @param licenseExpirationDate ISO date string (YYYY-MM-DD) or undefined
 * @returns true if reminders should be sent (1 week or less until expiration)
 */
export function shouldSendExpirationReminders(licenseExpirationDate?: string): boolean {
  if (!licenseExpirationDate) {
    // To-do: Require expiration date.
    return true;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiration = new Date(licenseExpirationDate);
  expiration.setHours(0, 0, 0, 0);

  // Calculate days until expiration
  const daysUntilExpiration = Math.ceil(
    (expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Send reminders if expiration is within 1 week (7 days) or already expired
  return daysUntilExpiration <= 7;
}
