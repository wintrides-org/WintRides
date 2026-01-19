import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RequestStatus } from "@prisma/client";
import { getSession, getUserById } from "@/lib/mockUsers";

// GET /api/requests - list ride requests (defaults to OPEN).
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "OPEN";
    const driverId = searchParams.get("driverId");

    if (status === "OPEN") {
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

      const user = await getUserById(session.userId);
      if (!user) {
        return NextResponse.json(
          { error: "User not found." },
          { status: 404 }
        );
      }

      if (!user.driverInfo) {
        return NextResponse.json(
          { error: "Driver capability is required to view open requests." },
          { status: 403 }
        );
      }
    }

    const requests = await prisma.rideRequest.findMany({
      where: {
        status: status as RequestStatus,
        ...(driverId ? { acceptedDriverId: driverId } : {}),
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
