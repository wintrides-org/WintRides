import { NextRequest, NextResponse } from "next/server";
import { lockCarpool } from "@/lib/mockCarpools";

// POST /api/carpools/[id]/lock - Lock a carpool (creator only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { creatorId } = body;

    if (!creatorId) {
      return NextResponse.json(
        { error: "creatorId is required" },
        { status: 400 }
      );
    }

    const carpool = lockCarpool(id, creatorId);

    if (!carpool) {
      return NextResponse.json(
        { error: "Carpool not found or you are not the creator" },
        { status: 404 }
      );
    }

    return NextResponse.json({ carpool }, { status: 200 });
  } catch (error) {
    console.error("Error locking carpool:", error);
    return NextResponse.json(
      { error: "Failed to lock carpool" },
      { status: 500 }
    );
  }
}

