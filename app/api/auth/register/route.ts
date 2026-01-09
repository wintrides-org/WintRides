/**
 * POST /api/auth/register
 * 
 * Register a new user account
 * 
 * FLOW:
 * 1. Validate request body (email, password, optional driver fields)
 * 2. Check if user already exists
 * 3. Validate driver requirements (if wantsToDrive is true)
 * 4. Create user account (email not verified yet)
 * 5. Generate verification token
 * 6. Return success response with verification token (MVP only)
 * 
 * MVP:
 *   - Returns verification token in response (for dev testing)
 *   - Logs verification link to console
 *   - License upload is base64 data URL
 * 
 * Production:
 *   - NEVER return verification token in response
 *   - Send verification email using email service (SendGrid, Resend, AWS SES)
 *   - Upload license to cloud storage (S3, Cloudinary) before storing URL
 *   - Add rate limiting to prevent spam registrations
 *   - Add CAPTCHA verification
 *   - Validate email format more strictly
 *   - Check password strength (complexity requirements)
 *   - Log registration attempts for security monitoring
 *   - Add IP-based rate limiting
 */

import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/mockUsers";

function getRegistrationErrorStatus(message: string): number {
  if (message.includes("already exists")) {
    return 409;
  }
  if (
    message.includes("Email must be from a valid campus domain") ||
    message.includes("Invalid email format") ||
    message.includes("Legal name is required") ||
    message.includes("License upload is required") ||
    message.includes("License verification failed")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, wantsToDrive, legalName, licenseUploadUrl } = body;

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

    // Validate password length
    // MVP: Minimum 8 characters
    // Production: Add complexity requirements (uppercase, lowercase, numbers, symbols)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    // MVP: Simple check
    // Production: Use database query with proper error handling
    if (getUserByEmail(email)) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 } // 409 Conflict
      );
    }

    // ========================================================================
    // DRIVER REGISTRATION VALIDATION
    // ========================================================================
    
    // If user wants to drive, validate driver-specific requirements
    if (wantsToDrive) {
      // Legal name is required for driver registration
      if (!legalName) {
        return NextResponse.json(
          { error: "Legal name is required for driver registration" },
          { status: 400 }
        );
      }
      
      // License upload is required for driver registration
      // MVP: License is base64 data URL
      // Production: License should already be uploaded to cloud storage, URL provided here
      if (!licenseUploadUrl) {
        return NextResponse.json(
          { error: "License upload is required for driver registration" },
          { status: 400 }
        );
      }
    }

    // ========================================================================
    // CREATE USER
    // ========================================================================
    
    // Create user account
    // This will:
    // - Validate email domain
    // - Hash password
    // - Generate pseudonym
    // - Create campus assignment
    // - If wantsToDrive: verify license and create driverInfo
    // - Generate email verification token
    const { user, verificationToken } = createUser({
      email,
      password,
      wantsToDrive: wantsToDrive || false,
      legalName,
      licenseUploadUrl
    });

    // ========================================================================
    // EMAIL VERIFICATION
    // ========================================================================
    
    // MVP: Log verification token to console (for development testing)
    // Production: Send verification email using email service
    //   - Use SendGrid, Resend, AWS SES, or similar
    //   - Include verification link: /verify-email?token=${verificationToken}
    //   - Token should expire after 24-48 hours
    //   - Include welcome message and instructions
    
    // For MVP, log the verification token (remove in production!)
    console.log(`[DEV] Verification token for ${email}: ${verificationToken}`);
    console.log(`[DEV] Verification link: ${request.nextUrl.origin}/verify-email?token=${verificationToken}`);

    // ========================================================================
    // RESPONSE
    // ========================================================================
    
    // MVP: Return verification token in response (for dev convenience)
    // Production: don't return token - send via email only
    return NextResponse.json(
      {
        message: "Registration successful. Please check your email for verification.",
        userId: user.id,
        // Only return token in development environment
        // In production, this should always be undefined
        verificationToken: process.env.NODE_ENV === "development" ? verificationToken : undefined
      },
      { status: 201 } // 201 Created
    );
  } catch (error: any) {
    // Error handling
    // MVP: Basic error logging
    // Production: 
    //   - Use structured logging (Winston, Pino)
    //   - Don't expose internal error messages to client
    //   - Log to monitoring service (Sentry, Datadog)
    console.error("Error registering user:", error);
    const message = error?.message || "Failed to register user";
    const status = getRegistrationErrorStatus(message);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
