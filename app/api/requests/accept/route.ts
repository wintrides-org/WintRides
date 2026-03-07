import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getUserById } from "@/lib/mockUsers";

// POST /api/requests/accept - accept a request if it's still OPEN.
export async function POST(request: NextRequest) {
   // looks for the session in the server to determine if it's valid
   // prevents people from accepting requests if they are not in a valid session (like if they are not on the app)
  try {
    const sessionToken =
      request.cookies.get("sessionToken")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");
    // if no session token exists, it means user is not on a valid session.
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Authentication required. Invalid session-- please log in!" },
        { status: 401 }
      );
    }
    // checks if the token is in the sessions table
    // catches fake/random tokens, expired tokens, or a token that was deleted
    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }
    // if valid session, get the user associated with the session directly
    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }
    // stores the ride request's id
    const body = (await request.json()) as {
      requestId?: string;
    };
    // if body has no requestId, return an error
    if (!body?.requestId) {
      return NextResponse.json(
        { error: "requestId is required." },
        { status: 400 }
      );
    }
    // if user has no driverInfo associated with it, user is not a driver and cannot accept rides
    if (!user.driverInfo) {
      return NextResponse.json(
        { error: "Driver capability is required to accept requests." },
        { status: 403 }
      );
    }
    // creates a rideRequest record with only two fields, the request's id and the requester's id
    // where and select are prisma key words
    // As used here, they imply where the request id exists, select its id and requester's id and create a request record with those
    const existingRequest = await prisma.rideRequest.findUnique({
      where: { id: body.requestId },
      select: { id: true, riderId: true }
    });
    // if request has been accepted or doesn't exist, return an error
    if (!existingRequest) {
      return NextResponse.json(
        { error: "Request not found." },
        { status: 404 }
      );
    }
    // if driver attempting to request the ride placed the ride request, don't allow it 
    if (existingRequest.riderId === user.id) {
      return NextResponse.json(
        { error: "Drivers cannot accept their own requests." },
        { status: 403 }
      );
    }

    // counts the number of rides that match the condition in 'where'
    // only the ride the driver clicked on "accept" for should have the id and riderId
    // so we are mostly checking that it is also open
    const updated = await prisma.rideRequest.updateMany({
      where: {
        id: existingRequest.id,
        status: "OPEN",
        riderId: { not: user.id },
      },
      data: {
        status: "MATCHED",
        acceptedDriverId: user.id,
        matchedAt: new Date(),
      },
    });
    // if updated.count is 0, then another driver accepted it so "the status=OPEN" requirement wasn't fulfilled
    if (updated.count === 0) {
      return NextResponse.json(
        {
          error:
            "Sorry, the request was already accepted by another driver.",
        },
        { status: 409 }
      );
    }

    await prisma.driverInfo.update({
      where: { userId: user.id },
      data: {
        acceptedRidesCount: {
          increment: 1,
        },
      },
    });

    // creates a new row in the "Notification" table on the database
    await prisma.notification.create({
      data: {
        userId: existingRequest.riderId,
        type: "RIDE_ACCEPTED",
        message: "Your ride request was accepted by a driver.",
        rideRequestId: existingRequest.id,
      },
    });

    // MVP: notification placeholder for rider.
    return NextResponse.json(
      { ok: true, message: "Request accepted." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error accepting request:", error);
    return NextResponse.json(
      { error: "Failed to accept request." },
      { status: 500 }
    );
  }
}
