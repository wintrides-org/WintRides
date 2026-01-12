import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/requests/accept - accept a request if it's still OPEN.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      requestId?: string;
      driverId?: string;
    };

    if (!body?.requestId || !body?.driverId) {
      return NextResponse.json(
        { error: "requestId and driverId are required." },
        { status: 400 }
      );
    }

    const updated = await prisma.rideRequest.updateMany({
      where: {
        id: body.requestId,
        status: "OPEN",
      },
      data: {
        status: "MATCHED",
        acceptedDriverId: body.driverId,
        matchedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        {
          error:
            "Sorry, the request was already accepted by another driver.",
        },
        { status: 409 }
      );
    }

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
