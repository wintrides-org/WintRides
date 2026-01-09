import { NextRequest, NextResponse } from "next/server";
import { addParticipant } from "@/lib/mockCarpools";

// POST /api/carpools/[id]/join - Join a carpool as a participant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const carpool = addParticipant(id, userId);

    if (!carpool) {
      return NextResponse.json(
        { error: "Carpool not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ carpool }, { status: 200 });
  } catch (error) {
    console.error("Error joining carpool:", error);
    return NextResponse.json(
      { error: "Failed to join carpool" },
      { status: 500 }
    );
  }
}

