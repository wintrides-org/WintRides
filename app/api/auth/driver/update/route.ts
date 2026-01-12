/**
 * POST /api/auth/driver/update
 *
 * Update stored driver license details for an existing driver.
 *
 * FLOW:
 * 1. Authenticate user (check session)
 * 2. Validate request body (manual license fields)
 * 3. Update stored driver license details
 * 4. Return success response
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession, updateDriverLicenseDetails } from "@/lib/mockUsers";
import { validateDriverLicenseInput } from "@/lib/licenseValidation";

export async function POST(request: NextRequest) {
  try {
    // ========================================================================
    // AUTHENTICATION
    // ========================================================================
    const sessionToken =
      request.cookies.get("sessionToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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
    const body = await request.json();
    const { legalName, licenseNumber, licenseExpirationDate, issuingState } = body;

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
    // UPDATE DRIVER DETAILS
    // ========================================================================
    const user = await updateDriverLicenseDetails(
      session.userId,
      legalName,
      licenseNumber,
      licenseExpirationDate,
      issuingState
    );

    if (!user) {
      return NextResponse.json(
        { error: "Driver capability not enabled" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        message: "Driver license details updated successfully",
        user: {
          id: user.id,
          isDriver: true,
          isDriverAvailable: user.isDriverAvailable
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating driver license details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update driver license details" },
      { status: 500 }
    );
  }
}
