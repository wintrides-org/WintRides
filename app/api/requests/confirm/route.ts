import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildQuote,
  type QuoteInput,
} from "@/lib/requestValidation";

// POST /api/requests/confirm - re-validate input and persist the request.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuoteInput;
    const { data, errors } = buildQuote(body);

    if (errors || !data) {
      return NextResponse.json(
        { error: "Invalid request", details: errors },
        { status: 400 }
      );
    }

    const created = await prisma.rideRequest.create({
      data: {
        riderId: "rider_placeholder",
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
