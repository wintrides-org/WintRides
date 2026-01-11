/**
 * GET /api/auth/verify-email?token=...
 * 
 * Verify user email with verification token
 * 
 * FLOW:
 * 1. Extract token from query parameters
 * 2. Validate token exists
 * 3. Verify token and mark email as verified
 * 4. Return success response
 * 
 * MVP:
 *   - Token is in URL query parameter
 *   - One-time use token (cleared after verification)
 * 
 * Production:
 *   - Tokens should expire after 24-48 hours
 *   - Add rate limiting to prevent token brute force attacks
 *   - Log verification attempts for security monitoring
 *   - Consider using POST instead of GET (more secure for sensitive operations)
 *   - Add CSRF protection
 *   - Track verification attempts per IP
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyEmail } from "@/lib/mockUsers";

export async function GET(request: NextRequest) {
  try {
    // Extract token from query parameters
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    // Validate token exists
    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // ========================================================================
    // VERIFY EMAIL
    // ========================================================================
    
    // Verify email with token
    // This will:
    // - Find user by verification token
    // - Mark email as verified
    // - Clear verification token (one-time use)
    // - Update verification timestamp
    const user = await verifyEmail(token);

    // Check if verification was successful
    if (!user) {
      // Token is invalid or expired
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // ========================================================================
    // RESPONSE
    // ========================================================================
    
    // Return success with user info (excluding sensitive data)
    return NextResponse.json(
      {
        message: "Email verified successfully",
        user: {
          id: user.id,
          email: user.email,
          pseudonym: user.pseudonym,
          campusId: user.campusId,
          isDriver: !!user.driverInfo // Whether user has driver capability
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Error handling
    // MVP: Basic error logging
    // Production: Use structured logging and monitoring
    console.error("Error verifying email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify email" },
      { status: 500 }
    );
  }
}
