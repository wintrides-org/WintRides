import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getUserById } from "@/lib/mockUsers";
import {
  buildQuote,
  type QuoteInput,
} from "@/lib/requestValidation";

// Defines how long after a ride request is confirmed before a rider can place another request
const OVERLAP_WINDOW_MINUTES = 30;

// POST /api/requests/confirm - re-validate input and persist the request.
export async function POST(request: NextRequest) {
  // looks for the session in the server to determine if it's valid
   // prevents people from placing requests if they are not in a valid session (like if they are not on the app)
  try {
    const sessionToken =
      request.cookies.get("sessionToken")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");
    // if no session token exists, it means user is not on a valid session.
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Authentication required." },
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
    // Reads the request as a quote input
    const body = (await request.json()) as QuoteInput;
    // Runs buildQuote(body) to validate it, returning data (cleaned input) and errors (validation issues)
    const { data, errors } = buildQuote(body);

    if (errors || !data) {
      return NextResponse.json(
        { error: "Invalid request", details: errors },
        { status: 400 }
      );
    }

    // Defines the full day-time window, from when the day begins to when it ends
    const pickupAt = new Date(data.pickupAt);
    const dayStart = new Date(pickupAt);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(pickupAt);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // Gets all upcoming rides placed by the rider
    const existing = await prisma.rideRequest.findMany({
      where: {
        riderId: user.id,
        status: { in: ["OPEN", "MATCHED"] },
        pickupAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: { id: true, pickupAt: true, status: true },
    });

    // Checks if there's an overlap between any upcoming ride and the ride to be requested
    const overlapMs = OVERLAP_WINDOW_MINUTES * 60 * 1000;
    const hasOverlap = existing.some((request) => {
      const diff = Math.abs(request.pickupAt.getTime() - pickupAt.getTime());
      return diff <= overlapMs;
    });
    // Throws an error if ride to be requested overlaps with an upcoming ride
    if (hasOverlap) {
      return NextResponse.json(
        {
          error:
            "This request overlaps another upcoming ride. Please choose a different time.",
        },
        { status: 409 }
      );
    }

    // inserts the request payload as a row in the table with the values defined as data.x
    const created = await prisma.rideRequest.create({
      data: {
        riderId: user.id,
        bookedForSelf: data.bookedForSelf,
        type: data.type,
        status: "OPEN",
        pickupLabel: data.pickup.label,
        pickupAddress: data.pickup.address,
        dropoffLabel: data.dropoff.label,
        dropoffAddress: data.dropoff.address,
        pickupNotes: data.pickupNotes,
        partySize: data.partySize,
        pickupAt: new Date(data.pickupAt),
        carsNeeded: data.carsNeeded,
      },
    });

    return NextResponse.json({ request: created }, { status: 201 });

  } catch (error) {
    console.error("Error confirming request:", error);
    return NextResponse.json(
      { error: "Failed to confirm request" },
      { status: 500 }
    );
  }
}
