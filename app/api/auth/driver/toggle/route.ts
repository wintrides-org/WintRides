/**
 * POST /api/auth/driver/toggle
 * 
 * Toggle driver availability on/off
 * 
 * FLOW:
 * 1. Authenticate user (check session)
 * 2. Validate request body (isAvailable boolean)
 * 3. If toggling ON:
 *    a. Check if user has driver capability (must enable first if not)
 *    b. Automatically verify stored license is still valid
 * 4. Update driver availability
 * 5. Return success response
 * 
 * KEY BEHAVIOR:
 * - Toggling ON: Automatically verifies stored license if unexpired (no mandatory re-entry needed)
 * - Toggling OFF: Simply disables availability
 * - First-time enable: Must use /api/auth/driver/enable first
 * 
 * MVP:
 *   - License verification is based on license expiration date (no timestamp update if expired)
 *   - No mandatory re-entry required for subsequent toggles
 * 
 * Production:
 *   - May prompt periodic license re-entry or review (e.g., every 6 months)
 *   - Check license expiration date if stored
 *   - Could prompt user to confirm license is still valid
 *   - Track availability history for analytics
 *   - Add rate limiting to prevent abuse
 */

import { NextRequest, NextResponse } from "next/server";
import { updateDriverAvailability, verifyStoredLicense, getUserById, getSession } from "@/lib/mockUsers";

export async function POST(request: NextRequest) {
  try {
    // ========================================================================
    // AUTHENTICATION
    // ========================================================================
    
    // Get session token from cookie or header
    // User must be authenticated to toggle driver availability
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
    const { isAvailable, verifyLicense } = body;

    // Validate isAvailable is a boolean
    if (typeof isAvailable !== "boolean") {
      return NextResponse.json(
        { error: "isAvailable must be a boolean" },
        { status: 400 }
      );
    }

    // ========================================================================
    // LICENSE VERIFICATION (if toggling ON)
    // ========================================================================
    
    // If toggling ON and verifyLicense flag is set, verify stored license first.
    // MVP: Verification only succeeds if the expiration date has not passed.
    // Production: May want to make this mandatory or add periodic verification.
    if (isAvailable && verifyLicense) {
      const user = await getUserById(session.userId);
      if (user?.driverInfo) {
        // Verify stored license only when unexpired; return a clear error otherwise.
        const verifiedUser = await verifyStoredLicense(session.userId);
        if (!verifiedUser) {
          return NextResponse.json(
            { error: "Your driver's license has expired. Please re-enter your license details to continue driving." },
            { status: 400 }
          );
        }
      }
    }

    // ========================================================================
    // UPDATE DRIVER AVAILABILITY
    // ========================================================================
    
    // Update driver availability
    // This will:
    // - If toggling ON: Check if user has driver capability, verify stored license
    // - If toggling OFF: Simply disable availability
    // - Throw error if toggling ON without driver capability
    const user = await updateDriverAvailability(session.userId, isAvailable);

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
        message: `Driver availability ${isAvailable ? "enabled" : "disabled"}`,
        user: {
          id: user.id,
          isDriver: !!user.driverInfo, // Whether user has driver capability
          isDriverAvailable: user.isDriverAvailable // Current availability status
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Error handling
    // Common errors:
    // - "Driver capability not enabled" (if toggling ON without capability)
    // MVP: Basic error logging
    // Production: Use structured logging and monitoring
    console.error("Error toggling driver availability:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle driver availability" },
      { status: 500 }
    );
  }
}
