import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getUserById } from "@/lib/mockUsers";
import { RequestStatus } from "@prisma/client";
import { applyRiderCancellationPolicy } from "@/lib/payments";

// Defines the statuses for which a rider can cancel
const RIDER_CANCELABLE_STATUSES: RequestStatus[] = ["OPEN", "MATCHED", "EXPIRED"] as const;

// POST /api/requests/rider-cancel - cancel a rider request if it's still rider-cancelable.
export async function POST(request: NextRequest) {
  try {
    // Ensures user is signed into a valid session
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

    const body = (await request.json()) as { requestId?: string };
    if (!body?.requestId) {
      return NextResponse.json(
        { error: "requestId is required." },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.rideRequest.findUnique({
      where: { id: body.requestId },
      select: {
        id: true,
        requesterId: true,
        status: true,
        acceptedDriverId: true,
        dropoffLabel: true,
      },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    // check to ensure the cancel request was placed by a valid signed-in user
    if (existingRequest.requesterId !== user.id) {
      return NextResponse.json(
        { error: "Only the ride requester can cancel this request." },
        { status: 403 }
      );
    }

    // One-time cancel safety check: treat repeated cancel on the same request as a safe no-op.
    if (existingRequest.status === "CANCELED") {
      return NextResponse.json(
        { ok: true, alreadyCanceled: true, message: "Request already canceled." },
        { status: 200 }
      );
    }

    // Confirm that the status of the request is either open, expired, or matched (Completed and Drafted rides can't be canceled)
    if (!RIDER_CANCELABLE_STATUSES.includes(existingRequest.status)) {
      return NextResponse.json(
        { error: "Only OPEN, EXPIRED, or MATCHED requests can be canceled." },
        { status: 400 }
      );
    }

    const previousStatus = existingRequest.status;
    // update the status to CANCELED and stores information of who canceled it and when
    const updated = await prisma.rideRequest.updateMany({
      where: {
        id: existingRequest.id,
        requesterId: user.id,
        status: { in: [...RIDER_CANCELABLE_STATUSES] },
      },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        canceledBy: user.id,
      },
    });

    if (updated.count === 0) {
      const latest = await prisma.rideRequest.findUnique({
        where: { id: existingRequest.id },
        select: { status: true },
      });

      if (latest?.status === "CANCELED") {
        return NextResponse.json(
          { ok: true, alreadyCanceled: true, message: "Request already canceled." },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: "Request status changed. Please refresh and try again." },
        { status: 409 }
      );
    }

    // Apply the rider cancellation fee policy after the request itself is
    // marked canceled so Stripe logic stays downstream of the business action.
    await applyRiderCancellationPolicy(existingRequest.id);

    return NextResponse.json(
      {
        ok: true,
        message: "Request canceled.",
        canceledFromStatus: previousStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error canceling request:", error);
    return NextResponse.json(
      { error: "Failed to cancel request." },
      { status: 500 }
    );
  }
}
