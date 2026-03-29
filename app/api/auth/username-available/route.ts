
import { NextRequest, NextResponse } from "next/server";
import { getUserByUserName } from "@/lib/mockUsers";
import { validateUserName } from "@/lib/usernameValidation";

// export const runtime = "nodejs";

// GET /api/auth/username-available?userName=...
export async function GET(request: NextRequest) {
  try {
    const userName = request.nextUrl.searchParams.get("userName") || "";
    const { normalized, error } = validateUserName(userName);

    if (error || !normalized) {
      return NextResponse.json(
        { available: false, error },
        { status: 200 }
      );
    }

    const existing = await getUserByUserName(normalized);
    if (existing) {
      return NextResponse.json(
        {
          available: false,
          error:
            "This username has been taken. Choose a new username or sign in if you already created an account"
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ available: true }, { status: 200 });
  } catch (error) {
    console.error("Error checking username availability:", error);
    return NextResponse.json(
      { available: false, error: "Failed to check username." },
      { status: 500 }
    );
  }
}
