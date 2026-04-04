import { NextRequest, NextResponse } from "next/server";
import { getCarpoolById, cancelCarpool } from "@/lib/carpools";
import { getSessionUser } from "@/lib/sessionAuth";
import { prisma } from "@/lib/prisma";
import { cancelRidePayments } from "@/lib/payments";

// GET /api/carpools/[id] - Get a single carpool
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const carpool = await getCarpoolById(id);

    if (!carpool) {
      return NextResponse.json(
        { error: "Carpool not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ carpool }, { status: 200 });
  } catch (error) {
    console.error("Error fetching carpool:", error);
    return NextResponse.json(
      { error: "Failed to fetch carpool" },
      { status: 500 }
    );
  }
}

// PATCH /api/carpools/[id] - Cancel a carpool (creator only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getSessionUser(request);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const body = await request.json();

    if (body?.status !== "CANCELED") {
      return NextResponse.json(
        { error: "Only cancellation is supported." },
        { status: 400 }
      );
    }

    const existing = await getCarpoolById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Carpool not found" },
        { status: 404 }
      );
    }

    if (existing.creatorId !== auth.user.id) {
      return NextResponse.json(
        { error: "Only the creator can cancel this carpool." },
        { status: 403 }
      );
    }

    const carpool = await cancelCarpool(id, auth.user.id);
    if (!carpool) {
      return NextResponse.json(
        { error: "Failed to cancel carpool" },
        { status: 500 }
      );
    }

    // If the locked carpool already created a shared ride request, cancel the
    // downstream ride and release any uncaptured authorizations.
    const rideRequest = await prisma.rideRequest.findUnique({
      where: { carpoolId: id },
      select: { id: true },
    });

    if (rideRequest) {
      await prisma.rideRequest.update({
        where: { id: rideRequest.id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
          canceledBy: auth.user.id,
        },
      });
      await cancelRidePayments(rideRequest.id);
    }

    return NextResponse.json({ carpool }, { status: 200 });
  } catch (error) {
    console.error("Error updating carpool:", error);
    return NextResponse.json(
      { error: "Failed to update carpool" },
      { status: 500 }
    );
  }
}
