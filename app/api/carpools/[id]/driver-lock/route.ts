import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lockCarpool, getCarpoolById } from "@/lib/carpools";
import { getSessionUser } from "@/lib/sessionAuth";

const MIN_CONFIRMED_PARTICIPANTS_TO_LOCK = 2; // at least 2 participants must be confirmed in the carpool to LOCK

// POST /api/carpools/[id]/lock - Lock a carpool (creator only)
// POST /api/carpools/[id]/driver-lock - Lock a driver carpool and auto-create the matched ride.
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

    // variables to store the carpoolId and auto-created existing ride when locked
    const { id } = await params;
    const existing = await getCarpoolById(id);

    // handle all errors 
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

    if (existing.carpoolType !== "DRIVER") {
      return NextResponse.json(
        { error: "This endpoint only supports driver carpools." },
        { status: 400 }
      );
    }

    if (existing.confirmedCount < MIN_CONFIRMED_PARTICIPANTS_TO_LOCK) {
      return NextResponse.json(
        {
          error:
            "A minimum of two confirmed participants is required to lock a carpool request. If you are no longer interested in the carpool request, you can cancel it.",
        },
        { status: 400 }
      );
    }
    
    // only driver who created this request can lock it
    if (!auth.user.driverInfo) {
      return NextResponse.json(
        { error: "Driver capability is required to lock a driver carpool." },
        { status: 403 }
      );
    }

    let carpool = existing;

    if (existing.status !== "CONFIRMED") {
      const locked = await lockCarpool(id, auth.user.id);
      if (!locked) {
        return NextResponse.json(
          { error: "Failed to lock driver carpool." },
          { status: 409 }
        );
      }
      carpool = locked;
    }

    // store the created carpool ride in "existing ride"
    const existingRide = await prisma.rideRequest.findFirst({
      where: { sourceCarpoolId: id },
      select: {
        id: true,
        status: true,
        acceptedDriverId: true,
        sourceCarpoolId: true,
      },
    });

    // if successful, return the ride's details
    if (existingRide) {
      return NextResponse.json(
        { carpool, ride: existingRide, alreadyLocked: true },
        { status: 200 }
      );
    }

    // get riderIds of all confirmed riders
    const confirmedRiderIds = Array.from(
      new Set(
        carpool.participants
          .filter((participant) => participant.confirmedAt && !participant.isCreator)
          .map((participant) => participant.userId)
      )
    );

    const pickupAt = new Date(`${carpool.date}T${carpool.timeWindow.start}`);
    const now = new Date();

    // automatically creates the ride when "LOCK" is initiated by the driver
    const createdRide = await prisma.$transaction(async (tx) => {
      const ride = await tx.rideRequest.create({
        data: {
          requesterId: auth.user.id,
          sourceCarpoolId: carpool.id,
          acceptedDriverId: auth.user.id,
          bookedForSelf: true,
          type: "SCHEDULED",
          status: "MATCHED",
          pickupLabel: carpool.pickupArea,
          pickupAddress: carpool.pickupArea,
          dropoffLabel: carpool.destination,
          dropoffAddress: carpool.destination,
          pickupNotes: carpool.notes,
          partySize: confirmedRiderIds.length,
          pickupAt,
          carsNeeded: 1,
          matchedAt: now,
          participants: {
            create: confirmedRiderIds.map((userId) => ({
              userId,
              isPrimaryContact: false,
            })),
          },
        },
        select: {
          id: true,
          status: true,
          acceptedDriverId: true,
          sourceCarpoolId: true,
        },
      });

      await tx.driverInfo.update({
        where: { userId: auth.user.id },
        data: {
          acceptedRidesCount: {
            increment: 1,
          },
        },
      });

      return ride;
    });

    return NextResponse.json(
      { carpool, ride: createdRide, alreadyLocked: false },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error locking driver carpool:", error);
    return NextResponse.json(
      { error: "Failed to lock driver carpool" },
      { status: 500 }
    );
  }
}
