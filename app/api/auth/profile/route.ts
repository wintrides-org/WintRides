import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserByUserName, updateUserName } from "@/lib/mockUsers";
import { validateUserName } from "@/lib/usernameValidation";

// PATCH /api/auth/profile - update authenticated profile fields supported by MVP.
export async function PATCH(request: NextRequest) {
  try {
    const sessionToken =
      request.cookies.get("sessionToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      userName?: string;
    };

    const requestedUserName = body?.userName ?? "";
    const { normalized, error } = validateUserName(requestedUserName);

    if (error || !normalized) {
      return NextResponse.json(
        { error: error || "Invalid username." },
        { status: 400 }
      );
    }

    const existing = await getUserByUserName(normalized);
    if (existing && existing.id !== session.userId) {
      return NextResponse.json(
        { error: "This username is already taken." },
        { status: 409 }
      );
    }

    const user = await updateUserName(session.userId, normalized);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          userName: user.userName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
