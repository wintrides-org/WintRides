import { NextRequest, NextResponse } from "next/server";
import { getCarpoolById, removeParticipant } from "@/lib/carpools";
import { canCancelConfirmedParticipation } from "@/lib/carpoolDeparture";
import { getSessionUser } from "@/lib/sessionAuth";

// POST /api/carpools/[id]/leave — remove interest or cancel confirmed participation (non-creators only)
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
    const carpool = await getCarpoolById(id);

    if (!carpool) {
      return NextResponse.json({ error: "Carpool not found" }, { status: 404 });
    }

    const participant = carpool.participants.find((p) => p.userId === auth.user.id);
    if (!participant) {
      return NextResponse.json(
        { error: "You are not part of this carpool." },
        { status: 400 }
      );
    }

    if (participant.isCreator) {
      return NextResponse.json(
        { error: "Hosts cannot leave this way — cancel the carpool instead." },
        { status: 403 }
      );
    }

    if (participant.confirmedAt && !canCancelConfirmedParticipation(carpool)) {
      return NextResponse.json(
        {
          error:
            "Cancellation window is closed — you can no longer leave within 2 hours of departure."
        },
        { status: 400 }
      );
    }

    const updated = await removeParticipant(id, auth.user.id);
    if (!updated) {
      return NextResponse.json(
        { error: "Could not leave this carpool." },
        { status: 400 }
      );
    }

    return NextResponse.json({ carpool: updated }, { status: 200 });
  } catch (error) {
    console.error("Error leaving carpool:", error);
    return NextResponse.json(
      { error: "Failed to leave carpool" },
      { status: 500 }
    );
  }
}
