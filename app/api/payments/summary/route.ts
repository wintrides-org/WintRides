import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionAuth";
import { getPaymentAccountSummary } from "@/lib/payments";

// GET /api/payments/summary - return rider payment readiness, payout readiness, and recent transactions.
export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const summary = await getPaymentAccountSummary(auth.user.id);
    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    console.error("Error loading payment summary:", error);
    return NextResponse.json(
      { error: "Failed to load payment summary." },
      { status: 500 }
    );
  }
}
