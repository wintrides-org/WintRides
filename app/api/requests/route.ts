import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RequestStatus } from "@prisma/client";
import { getSession, getUserById } from "@/lib/mockUsers";

// GET /api/requests - list ride requests (defaults to OPEN).
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status") || "OPEN";
    const statusFilters = statusParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const driverId = searchParams.get("driverId");
    const riderId = searchParams.get("riderId");
    // stores whether or not the session needs validation
    // if riderId is provided or status or ride is OPEN which requires validation to view, returns True
    const needsSession = Boolean(riderId) || statusFilters.includes("OPEN");

    // if a validation is needed, it authenticates the session
    if (needsSession) {
      // gets the session token
      const sessionToken =
        request.cookies.get("sessionToken")?.value ||
        request.headers.get("authorization")?.replace("Bearer ", "");
      // if no token, then user not signed in, make them sign in
      if (!sessionToken) {
        return NextResponse.json(
          { error: "Authentication required." },
          { status: 401 }
        );
      }
      // if session token, get the session
      const session = await getSession(sessionToken);
      // if no session, then session token might have been fake or expired
      if (!session) {
        return NextResponse.json(
          { error: "Invalid or expired session." },
          { status: 401 }
        );
      }
      // if session, get the user on that session
      const user = await getUserById(session.userId);
      if (!user) {
        return NextResponse.json(
          { error: "User not found." },
          { status: 404 }
        );
      }

      // if the rider placing the request is not a valid rider for that session, unauthorize
      if (riderId && user.id !== riderId) {
        return NextResponse.json(
          { error: "Unauthorized rider request access." },
          { status: 403 }
        );
      }

      // if the user is not a driver, don't show them OPEN ride requests unless scoped to themselves
      if (statusFilters.includes("OPEN") && !riderId && !user.driverInfo) {
        return NextResponse.json(
          { error: "Driver capability is required to view open requests." },
          { status: 403 }
        );
      }
    }

    // Query ride requests with status filters and optional driver/rider scoping, sorted by pickup time, selecting fields for the UI.
    const requests = await prisma.rideRequest.findMany({
      where: {
        status:
          statusFilters.length > 1
            ? { in: statusFilters as RequestStatus[] }
            : (statusFilters[0] as RequestStatus),
        ...(driverId ? { acceptedDriverId: driverId } : {}),
        ...(riderId ? { riderId } : {}),
      },
      orderBy: { pickupAt: "asc" },
      select: {
        id: true,
        status: true,
        type: true,
        pickupLabel: true,
        dropoffLabel: true,
        pickupAt: true,
        partySize: true,
        carsNeeded: true,
        acceptedDriverId: true,
        matchedAt: true,
      },
    });

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}
