import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/requests/complete - mark a matched request as completed.
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
        status: "MATCHED",
        acceptedDriverId: body.driverId,
      },
      data: {
        status: "COMPLETED",
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Unable to complete this ride." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: true, message: "Ride completed." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error completing request:", error);
    return NextResponse.json(
      { error: "Failed to complete ride." },
      { status: 500 }
    );
  }
}
