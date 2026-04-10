import { NextRequest, NextResponse } from "next/server";
import {
  getAllCarpools,
  createCarpool,
  filterCarpools,
  sortCarpoolsBySoonest
} from "@/lib/carpools";
import type { CarpoolStatus, CarpoolType } from "@/types/carpool";
import { getSessionUser } from "@/lib/sessionAuth";

// GET /api/carpools - List carpools with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const destination = searchParams.get("destination");
    const date = searchParams.get("date");

    let carpools = await getAllCarpools();

    const filters: {
      status?: CarpoolStatus[];
      destination?: string;
      date?: string;
    } = {};

    if (status) {
      filters.status = status.split(",") as CarpoolStatus[];
    }
    if (destination) {
      filters.destination = destination;
    }
    if (date) {
      filters.date = date;
    }

    if (Object.keys(filters).length > 0) {
      carpools = filterCarpools(carpools, filters);
    }

    carpools = sortCarpoolsBySoonest(carpools);

    return NextResponse.json({ carpools }, { status: 200 });
  } catch (error) {
    console.error("Error fetching carpools:", error);
    return NextResponse.json(
      { error: "Failed to fetch carpools" },
      { status: 500 }
    );
  }
}

// POST /api/carpools - Create a new carpool
export async function POST(request: NextRequest) {
  try {
    const auth = await getSessionUser(request);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    // Creating or joining carpools requires a saved payment method, but this
    // guard remains separate from the later ride-level authorization step.
    if (
      auth.user.paymentMethodStatus !== "READY" ||
      !auth.user.defaultPaymentMethodId
    ) {
      return NextResponse.json(
        {
          error:
            "Add a payment method in Account > Payments before creating a carpool.",
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const {
      destination,
      date,
      timeWindow,
      pickupArea,
      seatsNeeded,
      notes,
      status,
      carpoolType
    } = body;

    if (!destination || !date || !timeWindow || !pickupArea || seatsNeeded === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!timeWindow?.start || !timeWindow?.end) {
      return NextResponse.json(
        { error: "Time window start and end are required" },
        { status: 400 }
      );
    }

    if (seatsNeeded < 1) {
      return NextResponse.json(
        { error: "Seats needed must be at least 1" },
        { status: 400 }
      );
    }

    // set carpool type to rider or driver (if driver-capable and driver requested in inline modal)
    const resolvedCarpoolType: CarpoolType =
      auth.user.driverInfo && carpoolType === "DRIVER" ? "DRIVER" : "RIDER";

    const targetGroupSize = seatsNeeded + 1;

    const carpool = await createCarpool({
      creatorId: auth.user.id,
      carpoolType: resolvedCarpoolType,
      destination: destination.trim(),
      date,
      timeWindow,
      pickupArea: pickupArea.trim(),
      seatsNeeded,
      targetGroupSize,
      notes: notes?.trim(),
      status: status as CarpoolStatus
    });

    return NextResponse.json({ carpool }, { status: 201 });
  } catch (error) {
    console.error("Error creating carpool:", error);
    return NextResponse.json(
      { error: "Failed to create carpool" },
      { status: 500 }
    );
  }
}
