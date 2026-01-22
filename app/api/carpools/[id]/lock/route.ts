import { NextRequest, NextResponse } from "next/server";
import { lockCarpool, getCarpoolById } from "@/lib/carpools";
import { getSessionUser } from "@/lib/sessionAuth";

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

    return NextResponse.json({ carpool }, { status: 200 });
  } catch (error) {
    console.error("Error locking carpool:", error);
    return NextResponse.json(
      { error: "Failed to lock carpool" },
      { status: 500 }
    );
  }
}
