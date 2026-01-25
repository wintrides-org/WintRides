import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getUserById } from "@/lib/mockUsers";

// POST /api/requests/cancel - cancel a rider request if it's still OPEN or MATCHED.
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

    const body = (await request.json()) as { requestId?: string };
    if (!body?.requestId) {
      return NextResponse.json(
        { error: "requestId is required." },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.rideRequest.findUnique({
      where: { id: body.requestId },
      select: { id: true, riderId: true, status: true },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    if (existingRequest.riderId !== user.id) {
      return NextResponse.json(
        { error: "Only the rider can cancel this request." },
        { status: 403 }
      );
    }

    if (!(["OPEN", "MATCHED"] as const).includes(existingRequest.status)) {
      return NextResponse.json(
        { error: "Only OPEN or MATCHED requests can be canceled." },
        { status: 400 }
      );
    }

    const updated = await prisma.rideRequest.updateMany({
      where: {
        id: existingRequest.id,
        riderId: user.id,
        status: { in: ["OPEN", "MATCHED"] },
      },
      data: {
        status: "CANCELED",
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Request status changed. Please refresh and try again." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: true, message: "Request canceled." },
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
