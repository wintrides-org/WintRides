import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionAuth";
import { syncUserPaymentMethod } from "@/lib/payments";

// POST /api/payments/methods/sync - persist the rider's chosen default payment method locally.
export async function POST(request: NextRequest) {
  try {
    const auth = await getSessionUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json().catch(() => ({}))) as {
      paymentMethodId?: string;
    };

    const paymentMethod = await syncUserPaymentMethod(auth.user.id, body.paymentMethodId);

    return NextResponse.json(
      {
        ok: true,
        paymentMethod: paymentMethod
          ? {
              id: paymentMethod.id,
              brand: paymentMethod.card?.brand ?? null,
              last4: paymentMethod.card?.last4 ?? null,
              expMonth: paymentMethod.card?.exp_month ?? null,
              expYear: paymentMethod.card?.exp_year ?? null,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error syncing payment method:", error);
    return NextResponse.json(
      { error: "Failed to sync payment method." },
      { status: 500 }
    );
  }
}
