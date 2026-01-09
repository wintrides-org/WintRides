/**
 * POST /api/auth/driver/enable
 * 
 * Enable driver capability for a user (first time)
 * 
 * FLOW:
 * 1. Authenticate user (check session)
 * 2. Validate request body (legalName, licenseUploadUrl)
 * 3. Check if user already has driver capability (prevent duplicates)
 * 4. Verify license name matches legal name
 * 5. Create driverInfo with verification timestamps
 * 6. Enable driver availability
 * 7. Return success response
 * 
 * USE CASE:
 * - User didn't sign up as driver initially but wants to enable it later
 * - User needs to re-upload license (if previous one expired/invalid)
 * 
 * MVP:
 *   - License upload is base64 data URL
 *   - Basic license verification (just checks upload exists)
 * 
 * Production:
 *   - Upload license to cloud storage (S3, Cloudinary) before calling this endpoint
 *   - Use OCR to extract name from license and verify it matches legalName
 *   - May require manual admin review for first-time driver verification
 *   - Store license expiration date and check periodically
 *   - Add rate limiting to prevent abuse
 *   - Log driver capability enablement for audit trail
 */

import { NextRequest, NextResponse } from "next/server";
import { enableDriverCapability, getUserById, getSession } from "@/lib/mockUsers";

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
    const session = getSession(sessionToken);
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
    const { legalName, licenseUploadUrl, expirationDate } = body;
    
    // Note: expirationDate handling
    // MVP: expirationDate can be provided manually or left undefined
    // Production: expirationDate should be extracted via OCR from licenseUploadUrl
    //             Do NOT trust user-provided expirationDate - always extract via OCR

    // Validate legal name is provided
    if (!legalName || !legalName.trim()) {
      return NextResponse.json(
        { error: "Legal name is required" },
        { status: 400 }
      );
    }

    // Validate license upload is provided
    // MVP: License is base64 data URL
    // Production: License should already be uploaded to cloud storage, URL provided here
    if (!licenseUploadUrl) {
      return NextResponse.json(
        { error: "License upload is required" },
        { status: 400 }
      );
    }

    // ========================================================================
    // ENABLE DRIVER CAPABILITY
    // ========================================================================
    
    // Enable driver capability
    // This will:
    // - Check if user already has driver capability (throw error if yes)
    // - Verify license name matches legal name
    // - Extract license data (number, expiration) via OCR (production)
    // - Create driverInfo with verification timestamps and expiration date
    // - Enable driver availability automatically
    // 
    // Note: In production, expirationDate should come from OCR extraction, not user input
    // For MVP, expirationDate can be provided manually for testing
    const user = enableDriverCapability(session.userId, legalName, licenseUploadUrl, expirationDate);

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
