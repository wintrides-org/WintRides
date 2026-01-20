import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getUserById } from "@/lib/mockUsers";
import {
  buildQuote,
  type QuoteInput,
} from "@/lib/requestValidation";

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

    // inserts the request payload as a row in the table with the values defined as data.x
    const created = await prisma.rideRequest.create({
      data: {
        riderId: user.id,
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
