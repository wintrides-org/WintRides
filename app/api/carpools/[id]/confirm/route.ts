import { NextRequest, NextResponse } from "next/server";
import { confirmParticipant, unconfirmParticipant, getCarpoolById } from "@/lib/carpools";
import { getSessionUser } from "@/lib/sessionAuth";

// POST /api/carpools/[id]/confirm - Confirm participation in a carpool
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
    const body = await request.json();
    const { action = "confirm" } = body;

    const existing = await getCarpoolById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Carpool not found" },
        { status: 404 }
      );
    }

    if (["CANCELED", "COMPLETED", "EXPIRED"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Carpool is not accepting confirmations." },
        { status: 400 }
      );
    }

    const carpool =
      action === "unconfirm"
        ? await unconfirmParticipant(id, auth.user.id)
        : await confirmParticipant(id, auth.user.id);

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
