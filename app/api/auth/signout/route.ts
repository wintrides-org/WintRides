import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/mockUsers";

export async function POST(request: NextRequest) {
  try {
    // Accept the session token from either the cookie or the Authorization
    // header because the current app uses both during client-side auth flows.
    const sessionToken =
      request.cookies.get("sessionToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    // Signing out should succeed even when the client no longer has a valid
    // session, so we only attempt deletion when a token is present.
    if (sessionToken) {
      try {
        await deleteSession(sessionToken);
      } catch {
        // Ignore missing/expired session records and still clear the cookie.
      }
    }

    const response = NextResponse.json(
      { message: "Sign out successful" },
      { status: 200 }
    );

    // Expire the auth cookie on the response so browser-based sessions are
    // cleared even if the database session record was already missing.
    response.cookies.set("sessionToken", "", {
      maxAge: 0,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error: unknown) {
    console.error("Error signing out:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sign out" },
      { status: 500 }
    );
  }
}
