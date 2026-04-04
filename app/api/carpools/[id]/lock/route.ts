import { NextRequest, NextResponse } from "next/server";
import { lockCarpool, getCarpoolById } from "@/lib/carpools";
import { getSessionUser } from "@/lib/sessionAuth";
import { prisma } from "@/lib/prisma";
import {
  calculateRideAmountCents,
  ensureRidePaymentsForRequest,
  getConfirmedParticipantIds,
  processDueRideAuthorizations,
  refreshRidePaymentSummary,
} from "@/lib/payments";

function buildPickupAt(date: string, timeStart: string) {
  return new Date(`${date}T${timeStart}:00`);
}

// POST /api/carpools/[id]/lock - Lock a carpool (creator only)
export async function POST(
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
    const existing = await getCarpoolById(id);

    if (!existing) {
      return NextResponse.json(
        { error: "Carpool not found" },
        { status: 404 }
      );
    }

    if (existing.creatorId !== auth.user.id) {
      return NextResponse.json(
        { error: "Only the creator can lock this carpool." },
        { status: 403 }
      );
    }

    if (existing.confirmedCount < existing.targetGroupSize) {
      return NextResponse.json(
        { error: "Carpool does not have enough confirmed riders to lock." },
        { status: 400 }
      );
    }

    const carpool = await lockCarpool(id, auth.user.id);

    if (!carpool) {
      return NextResponse.json(
        { error: "Carpool not found or you are not the creator" },
        { status: 404 }
      );
    }

    // Locking a carpool freezes the participant list and creates the shared
    // ride request that drivers can then discover and accept.
    const confirmedRiderIds = getConfirmedParticipantIds(carpool.participants);
    const pickupAt = buildPickupAt(carpool.date, carpool.timeWindow.start);
    const quotedAmountPerRider = Math.ceil(
      calculateRideAmountCents(Math.max(1, confirmedRiderIds.length)) /
        Math.max(1, confirmedRiderIds.length)
    );

    const rideRequest = await prisma.rideRequest.upsert({
      where: { carpoolId: carpool.id },
      update: {
        status: "OPEN",
        pickupLabel: carpool.pickupArea,
        pickupAddress: carpool.pickupArea,
        dropoffLabel: carpool.destination,
        dropoffAddress: carpool.destination,
        partySize: confirmedRiderIds.length,
        pickupAt,
        quotedAmount: quotedAmountPerRider,
      },
      create: {
        riderId: auth.user.id,
        type: "GROUP",
        status: "OPEN",
        bookedForSelf: true,
        carpoolId: carpool.id,
        pickupLabel: carpool.pickupArea,
        pickupAddress: carpool.pickupArea,
        dropoffLabel: carpool.destination,
        dropoffAddress: carpool.destination,
        partySize: confirmedRiderIds.length,
        pickupAt,
        carsNeeded: 1,
        quotedAmount: quotedAmountPerRider,
        currency: "usd",
      },
    });

    // A locked carpool creates one rider payment row per confirmed participant.
    await ensureRidePaymentsForRequest({
      rideRequestId: rideRequest.id,
      riderIds: confirmedRiderIds,
      carpoolId: carpool.id,
    });
    await processDueRideAuthorizations(rideRequest.id);
    const paymentState = await refreshRidePaymentSummary(rideRequest.id);

    return NextResponse.json(
      { carpool, rideRequest, paymentSummary: paymentState.paymentSummary },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error locking carpool:", error);
    return NextResponse.json(
      { error: "Failed to lock carpool" },
      { status: 500 }
    );
  }
}
