/* Page to get the location of the driver using their browser's geolocation */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/mockUsers";

/* Parameters needed to define a location */
type DriverLocationBody = {
  requestId?: string; // ID of specific ride request location is to be shared for
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number; // level of accuracy (shows how many meters of error)
};

// POST /api/requests/driver-location - persist the driver's latest shared location for a matched ride.
export async function POST(request: NextRequest) {
  try {
    // gets the session token
    const sessionToken =
      request.cookies.get("sessionToken")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");
    // throws an error if no session token available
    if (!sessionToken) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    // gets session using the session token
    const session = await getSession(sessionToken);
    if (!session) {
      // throws an error if session is invalid or expired -> if sessionToken returns no session
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    // gets the location of the driver and parses it
    const body = (await request.json()) as DriverLocationBody;
    const requestId = body.requestId?.trim();
    const latitude = body.latitude;
    const longitude = body.longitude;
    const accuracyMeters = body.accuracyMeters;
    // ensures there is a valid ride request for which driver's location is being requested
    if (!requestId) {
      return NextResponse.json({ error: "requestId is required." }, { status: 400 });
    }
    // validates the longitude and latitudes
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required." },
        { status: 400 }
      );
    }
    // validates the accuracyMeters
    if (accuracyMeters !== undefined && !Number.isFinite(accuracyMeters)) {
      return NextResponse.json(
        { error: "accuracyMeters must be numeric when provided." },
        { status: 400 }
      );
    }
    // gets the ride request associated with requestId
    const rideRequest = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        acceptedDriverId: true,
      },
    });
    // returns error if there is no ride request associated with requestId
    if (!rideRequest) {
      return NextResponse.json({ error: "Ride request not found." }, { status: 404 });
    }
    // returns error if ride request exists for requestId but driver sharing location is not the driver who accepted the ride
    if (rideRequest.acceptedDriverId !== session.userId) {
      return NextResponse.json(
        { error: "Only the matched driver can share location for this ride." },
        { status: 403 }
      );
    }
    // ensures location sharing only occurs for MATCHED rides
    if (rideRequest.status !== "MATCHED") {
      return NextResponse.json(
        { error: "Driver GPS sharing is only available for matched rides." },
        { status: 409 }
      );
    }

    // keeps track of time duration of location sharing
    const now = new Date();
    const updated = await prisma.rideRequest.update({
      where: { id: requestId },
      data: {
        driverLocationSharingStartedAt: now,
        driverLocationLastLat: latitude,
        driverLocationLastLng: longitude,
        driverLocationAccuracyMeters: accuracyMeters,
        driverLocationLastSharedAt: now,
      },
      select: {
        id: true,
        driverLocationSharingStartedAt: true,
        driverLocationLastSharedAt: true,
      },
    });

    return NextResponse.json({ locationShare: updated }, { status: 200 });
  } catch (error) {
    console.error("Error saving driver location:", error);
    return NextResponse.json(
      { error: "Failed to save driver location." },
      { status: 500 }
    );
  }
}
