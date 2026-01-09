import { NextRequest, NextResponse } from "next/server";
import { confirmParticipant, unconfirmParticipant } from "@/lib/mockCarpools";

// POST /api/carpools/[id]/confirm - Confirm participation in a carpool
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, action = "confirm" } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    let carpool;
    if (action === "unconfirm") {
      carpool = unconfirmParticipant(id, userId);
    } else {
      carpool = confirmParticipant(id, userId);
    }

    if (!carpool) {
      return NextResponse.json(
        { error: "Carpool not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ carpool }, { status: 200 });
  } catch (error) {
    console.error("Error confirming participation:", error);
    return NextResponse.json(
      { error: "Failed to confirm participation" },
      { status: 500 }
    );
  }
}

