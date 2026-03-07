import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserById } from "@/lib/mockUsers";

// GET /api/users/:id - fetch minimal user profile details for rider confirmation cards.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require an authenticated session to read user profile details.
    const sessionToken =
      request.cookies.get("sessionToken")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

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

    // Fetch the requested user to build a lightweight profile for the rider view.
    const user = await getUserById(params.id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Temporary: Use ridesCompleted and a static rating to represent "review count"
    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.userName || "Driver",
          rating: 4.9,
          reviewsCount: user.ridesCompleted ?? 0,
          acceptedRidesCount: user.driverInfo?.acceptedRidesCount ?? 0,
          canceledRidesCount: user.driverInfo?.canceledRidesCount ?? 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user." },
      { status: 500 }
    );
  }
}
