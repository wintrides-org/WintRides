import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getUserById } from "@/lib/mockUsers";

const MIN_REASON_LENGTH = 15;

// POST /api/requests/driver-cancel - reopen a matched ride after a driver cancels it.
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!user.driverInfo) {
      return NextResponse.json(
        { error: "Driver capability is required to cancel this ride." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      requestId?: string;
      reason?: string;
    };

    const reason = body?.reason?.trim() || "";

    if (!body?.requestId) {
      return NextResponse.json(
        { error: "requestId is required." },
        { status: 400 }
      );
    }

    if (reason.length < MIN_REASON_LENGTH) {
      return NextResponse.json(
        { error: "Reason for cancelation is unclear/too short." },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.rideRequest.findUnique({
      where: { id: body.requestId },
      select: {
        id: true,
        riderId: true,
        status: true,
        acceptedDriverId: true,
      },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    if (existingRequest.status !== "MATCHED") {
      return NextResponse.json(
        { error: "Driver can only cancel rides that are MATCHED." },
        { status: 400 }
      );
    }

    if (existingRequest.acceptedDriverId !== user.id) {
      return NextResponse.json(
        { error: "Only the matched driver can cancel this ride." },
        { status: 403 }
      );
    }

    const updated = await prisma.rideRequest.updateMany({
      where: {
        id: existingRequest.id,
        status: "MATCHED",
        acceptedDriverId: user.id,
      },
      data: {
        status: "OPEN",
        acceptedDriverId: null,
        matchedAt: null,
        driverCancelReason: reason,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Ride status changed. Please refresh and try again." },
        { status: 409 }
      );
    }

    await prisma.driverInfo.update({
      where: { userId: user.id },
      data: {
        canceledRidesCount: {
          increment: 1,
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: existingRequest.riderId,
        type: "DRIVER_CANCELED",
        message:
          "Your driver canceled, we’re sorry about this. We’re working hard to find you a new driver ASAP",
        rideRequestId: existingRequest.id,
      },
    });

    return NextResponse.json(
      { ok: true, message: "Ride canceled and reopened to drivers." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error canceling ride as driver:", error);
    return NextResponse.json(
      { error: "Failed to cancel ride." },
      { status: 500 }
    );
  }
}
