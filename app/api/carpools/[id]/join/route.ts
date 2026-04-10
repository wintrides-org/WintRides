import { NextRequest, NextResponse } from "next/server";
import { addParticipant, getCarpoolById } from "@/lib/carpools";
import { getSessionUser } from "@/lib/sessionAuth";

// POST /api/carpools/[id]/join - Join a carpool as a participant
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

    if (
      auth.user.paymentMethodStatus !== "READY" ||
      !auth.user.defaultPaymentMethodId
    ) {
      return NextResponse.json(
        {
          error:
            "Add a payment method in Account > Payments before joining a carpool.",
        },
        { status: 409 }
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

    if (existing.status !== "OPEN" && existing.status !== "PENDING_CONFIRMATIONS") {
      return NextResponse.json(
        { error: "Carpool is not open for joining." },
        { status: 400 }
      );
    }

    const carpool = await addParticipant(id, auth.user.id);

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
