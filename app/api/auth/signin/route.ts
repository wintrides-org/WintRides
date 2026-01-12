/**
 * POST /api/auth/signin
 * 
 * Sign in with email and password
 * 
 * FLOW:
 * 1. Validate request body (email, password)
 * 2. Authenticate user (verify password)
 * 3. Check if email is verified (must verify before sign in)
 * 4. Create session
 * 5. Set session cookie
 * 6. Return user info
 * 
 * MVP:
 *   - Basic authentication
 *   - Session stored in database
 *   - Cookie set with session token
 * 
 * Production:
 *   - Add rate limiting to prevent brute force attacks
 *   - Implement account lockout after failed attempts (e.g., 5 attempts)
 *   - Use httpOnly cookies (prevents XSS attacks)
 *   - Use secure cookies (HTTPS only)
 *   - Add 2FA support for enhanced security
 *   - Log authentication attempts for security monitoring
 *   - Track device/browser for suspicious activity detection
 *   - Use JWT tokens instead of simple session tokens
 *   - Implement refresh tokens for longer sessions
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/mockUsers";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // ========================================================================
    // VALIDATION
    // ========================================================================
    
    // Check required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // ========================================================================
    // AUTHENTICATION
    // ========================================================================
    
    // Authenticate user
    // This will:
    // - Find user by email
    // - Verify password hash
    // - Check if email is verified
    // - Update last login timestamp
    let user;
    try {
      user = await authenticateUser(email, password);
    } catch (error: any) {
      // Handle email not verified error
      // User must verify email before they can sign in
      if (error.message.includes("Email not verified")) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 } // 403 Forbidden (email not verified)
        );
      }
      throw error;
    }

    // Check if authentication failed
    if (!user) {
      // Invalid email or password
      // MVP: Generic error message (don't reveal which is wrong)
      // Production: Add rate limiting here to prevent brute force
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 } // 401 Unauthorized
      );
    }

    // ========================================================================
    // SESSION CREATION
    // ========================================================================
    
    // Create session for authenticated user
    // MVP: 24 hour session, stored in database
    // Production: Use Redis for session storage, implement refresh tokens
    const sessionToken = await createSession(user.id, 24); // 24 hour session

    // ========================================================================
    // RESPONSE
    // ========================================================================
    
    // Create response with user info (excluding sensitive data)
    // MVP: Use httpOnly cookie for session
    // Production: Only use httpOnly cookies (don't return token in body)
    const response = NextResponse.json(
      {
        message: "Sign in successful",
        sessionToken,
        user: {
          id: user.id,
          email: user.email,
          pseudonym: user.pseudonym,
          campusId: user.campusId,
          isDriver: !!user.driverInfo, // Whether user has driver capability
          isDriverAvailable: user.isDriverAvailable // Current driver availability
        },
      },
      { status: 200 }
    );

    // ========================================================================
    // SET SESSION COOKIE
    // ========================================================================
    
    // Set session cookie
    // MVP: Basic cookie settings
    // Production:
    //   - Use httpOnly: true (prevents JavaScript access, prevents XSS)
    //   - Use secure: true (HTTPS only)
    //   - Use sameSite: "strict" (CSRF protection)
    //   - Consider shorter expiration for sensitive operations
    response.cookies.set("sessionToken", sessionToken, {
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    return response;
  } catch (error: any) {
    // Error handling
    // MVP: Basic error logging
    // Production: Use structured logging and monitoring
    console.error("Error signing in:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sign in" },
      { status: 500 }
    );
  }
}
