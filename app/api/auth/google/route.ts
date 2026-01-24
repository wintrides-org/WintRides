import { NextRequest, NextResponse } from "next/server"; // Import Next.js request/response helpers.
import { OAuth2Client } from "google-auth-library"; // Import Google OAuth client for ID token verification.
import { createSession, findOrCreateGoogleUser } from "@/lib/mockUsers"; // Use existing session/user helpers.

const googleClientId = // Define the Google OAuth client ID used for verification.
  process.env.GOOGLE_CLIENT_ID || // Prefer server-only env var if present.
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID; // Fallback to public env var if needed.
const googleClient = new OAuth2Client(googleClientId); // Initialize Google OAuth client.

export async function POST(request: NextRequest) { // Handle Google sign-in requests.
  try { // Wrap the handler in a try/catch for error responses.
    if (!googleClientId) { // Ensure the Google client ID is configured.
      return NextResponse.json( // Return a server error when config is missing.
        { error: "Google client ID is not configured" }, // Provide a clear error message.
        { status: 500 } // Use 500 to indicate server misconfiguration.
      );
    }

    const body = await request.json(); // Parse the incoming JSON body.
    const idToken = body?.idToken; // Read the ID token from the request payload.

    if (!idToken || typeof idToken !== "string") { // Validate that an ID token was provided.
      return NextResponse.json( // Return a client error for missing/invalid token.
        { error: "idToken is required" }, // Explain the validation error.
        { status: 400 } // Use 400 for bad request.
      );
    }

    const ticket = await googleClient.verifyIdToken({ // Verify the ID token with Google.
      idToken, // Pass the token received from the client.
      audience: googleClientId // Ensure the token is meant for our client ID.
    });

    const payload = ticket.getPayload(); // Extract the verified token payload.
    const email = payload?.email; // Read the email claim from the payload.
    const emailVerified = payload?.email_verified; // Read the email_verified claim.

    if (!email || !emailVerified) { // Enforce presence of verified email.
      return NextResponse.json( // Return unauthorized for unverified or missing email.
        { error: "Google account email is not verified" }, // Provide a clear error message.
        { status: 401 } // Use 401 to indicate auth failure.
      );
    }

    const user = await findOrCreateGoogleUser(email); // Find or create a user for this Google email.
    const sessionToken = await createSession(user.id, 24); // Create a 24-hour session token.

    const response = NextResponse.json( // Build the success response payload.
      {
        message: "Google sign-in successful", // Provide a friendly success message.
        user: { // Return safe user details for the client.
          id: user.id, // Include the user ID.
          email: user.email, // Include the user email.
          campusId: user.campusId, // Include the campus association.
          isDriver: !!user.driverInfo, // Indicate driver capability.
          isDriverAvailable: user.isDriverAvailable // Include current driver availability.
        },
      },
      { status: 200 } // Use 200 for success.
    );

    response.cookies.set("sessionToken", sessionToken, { // Set the session token cookie.
      maxAge: 24 * 60 * 60, // Expire in 24 hours.
      path: "/", // Make cookie available to all routes.
      httpOnly: true, // Prevent JavaScript access to the cookie.
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production.
      sameSite: "lax" // Provide basic CSRF protection.
    });

    return response; // Return the final response.
  } catch (error: any) { // Catch any unexpected errors.
    console.error("Error in Google sign-in:", error); // Log the error for debugging.
    return NextResponse.json( // Return a generic server error response.
      { error: error?.message || "Failed to sign in with Google" }, // Provide a safe error message.
      { status: 500 } // Use 500 for server errors.
    );
  }
}
