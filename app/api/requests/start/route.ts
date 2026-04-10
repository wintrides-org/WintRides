import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserById } from "@/lib/mockUsers";
import { prisma } from "@/lib/prisma";
import { captureRidePaymentsForRequest } from "@/lib/payments";

// POST /api/requests/start - capture authorized payments when a matched ride begins.
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
    if (!user?.driverInfo) {
      return NextResponse.json(
        { error: "Driver capability is required to start rides." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { requestId?: string };
    if (!body?.requestId) {
      return NextResponse.json(
        { error: "requestId is required." },
        { status: 400 }
      );
    }

    const rideRequest = await prisma.rideRequest.findUnique({
      where: { id: body.requestId },
      select: {
        id: true,
        status: true,
        acceptedDriverId: true,
      },
    });

    if (!rideRequest || rideRequest.status !== "MATCHED" || rideRequest.acceptedDriverId !== user.id) {
      return NextResponse.json(
        { error: "Only the matched driver can start this ride." },
        { status: 409 }
      );
    }

    await captureRidePaymentsForRequest(rideRequest.id);

    return NextResponse.json(
      { ok: true, message: "Ride started and payment capture has been triggered." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error starting ride:", error);
    return NextResponse.json(
      { error: "Failed to start ride." },
      { status: 500 }
    );
  }
}
