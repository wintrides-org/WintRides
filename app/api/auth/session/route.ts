/**
 * GET /api/auth/session
 * 
 * Get current session/user information
 * 
 * FLOW:
 * 1. Extract session token from cookie or Authorization header
 * 2. Validate session token exists
 * 3. Get session from storage
 * 4. Check if session is valid (not expired)
 * 5. Get user information
 * 6. Return user info and session expiration
 * 
 * USE CASES:
 * - Check if user is authenticated
 * - Get current user info for UI display
 * - Verify session is still valid
 * 
 * MVP:
 *   - Session token from cookie or header
 *   - In-memory session lookup
 * 
 * Production:
 *   - Prefer httpOnly cookies (more secure)
 *   - Use Redis for session storage
 *   - Add caching for frequently accessed user data
 *   - Consider using middleware for authentication checks
 *   - Add rate limiting to prevent abuse
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserById } from "@/lib/mockUsers";

export async function GET(request: NextRequest) {
  try {
    // ========================================================================
    // EXTRACT SESSION TOKEN
    // ========================================================================
    
    // Get session token from cookie or Authorization header
    // MVP: Support both methods for flexibility
    // Production: Prefer httpOnly cookies (more secure, prevents XSS)
    const sessionToken = 
      request.cookies.get("sessionToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    // Validate session token exists
    if (!sessionToken) {
      return NextResponse.json(
        { error: "No session found" },
        { status: 401 } // 401 Unauthorized
      );
    }

    // ========================================================================
    // VALIDATE SESSION
    // ========================================================================
    
    // Get session from storage
    // This will:
    // - Look up session by token
    // - Check if session is expired
    // - Return session info if valid
    const session = await getSession(sessionToken);
    
    if (!session) {
      // Session not found or expired
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 } // 401 Unauthorized
      );
    }

    // ========================================================================
    // GET USER INFORMATION
    // ========================================================================
    
    // Get user by ID from session
    // MVP: Simple lookup
    // Production: Add caching for frequently accessed users
    const user = await getUserById(session.userId);
    
    if (!user) {
      // User not found (shouldn't happen, but handle gracefully)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ========================================================================
    // RESPONSE
    // ========================================================================
    
    // Return user info (excluding sensitive data like password hash)
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          pseudonym: user.pseudonym,
          campusId: user.campusId,
          isDriver: !!user.driverInfo, // Whether user has driver capability
          isDriverAvailable: user.isDriverAvailable // Current driver availability
        },
        expiresAt: session.expiresAt // When session expires
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Error handling
    // MVP: Basic error logging
    // Production: Use structured logging and monitoring
    console.error("Error getting session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get session" },
      { status: 500 }
    );
  }
}
