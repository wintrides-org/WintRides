import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RequestStatus } from "@prisma/client";

// GET /api/requests - list ride requests (defaults to OPEN).
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "OPEN";
    const driverId = searchParams.get("driverId");

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
