/**
 * POST /api/auth/driver/enable
 * 
 * Enable driver capability for a user (first time)
 * 
 * FLOW:
 * 1. Authenticate user (check session)
 * 2. Validate request body (manual license fields)
 * 3. Check if user already has driver capability (prevent duplicates)
 * 4. Validate manual license details (state rules + expiration window)
 * 5. Create driverInfo with verification timestamps
 * 6. Enable driver availability
 * 7. Return success response
 * 
 * USE CASE:
 * - User didn't sign up as driver initially but wants to enable it later
 * - User can re-enter license details at any time; expiration still blocks driving
 * 
 * MVP:
 *   - Manual license validation (state-aware rules)
 * 
 * Production:
 *   - Validate license details against authoritative sources where possible
 *   - May require manual admin review for first-time driver verification
 *   - Store license expiration date and check periodically
 *   - Add rate limiting to prevent abuse
 *   - Log driver capability enablement for audit trail
 */

import { NextRequest, NextResponse } from "next/server";
import { enableDriverCapability, getUserById, getSession } from "@/lib/mockUsers";
import { validateDriverLicenseInput } from "@/lib/licenseValidation";

export async function POST(request: NextRequest) {
  try {
    // ========================================================================
    // AUTHENTICATION
    // ========================================================================
    
    // Get session token from cookie or header
    // User must be authenticated to enable driver capability
    const sessionToken = 
      request.cookies.get("sessionToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Validate session
    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================
    
    // Parse request body
    const body = await request.json();
    const {
      legalName,
      licenseNumber,
      licenseExpirationDate,
      issuingState
    } = body;
    
    // Manual license entry:
    // - Validate the provided details using state-aware rules.
    // - Reject any missing or malformed data before enabling driver capability.

    // Validate legal name is provided
    if (!legalName || !legalName.trim()) {
      return NextResponse.json(
        { error: "Legal name is required" },
        { status: 400 }
      );
    }

    // Legacy license upload validation (deprecated in manual-entry flow).
    // if (!licenseUploadUrl) {
    //   return NextResponse.json(
    //     { error: "License upload is required" },
    //     { status: 400 }
    //   );
    // }

    // Validate manual license entry against shared rules.
    const licenseErrors = validateDriverLicenseInput({
      legalName,
      licenseNumber,
      licenseExpirationDate,
      issuingState
    });

    if (Object.keys(licenseErrors).length > 0) {
      const firstError = Object.values(licenseErrors)[0];
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      );
    }

    // ========================================================================
    // ENABLE DRIVER CAPABILITY
    // ========================================================================
    
    // Enable driver capability
    // This will:
    // - Check if user already has driver capability (throw error if yes)
    // - Store validated license details
    // - Create driverInfo with verification timestamps and expiration date
    // - Enable driver availability automatically
    // 
    // Manual entry: pass validated fields to the mock store.
    const user = await enableDriverCapability(
      session.userId,
      legalName,
      licenseNumber,
      licenseExpirationDate,
      issuingState
    );

    // Check if user was found
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ========================================================================
    // RESPONSE
    // ========================================================================
    
    // Return success with updated user info
    return NextResponse.json(
      {
        message: "Driver capability enabled successfully",
        user: {
          id: user.id,
          isDriver: true, // User now has driver capability
          isDriverAvailable: user.isDriverAvailable // Availability is automatically enabled
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Error handling
    // Common errors:
    // - "User already has driver capability enabled" (409 Conflict)
    // - "License verification failed" (400 Bad Request)
    // MVP: Basic error logging
    // Production: Use structured logging and monitoring
    console.error("Error enabling driver capability:", error);
    return NextResponse.json(
      { error: error.message || "Failed to enable driver capability" },
      { status: 500 }
    );
  }
}
