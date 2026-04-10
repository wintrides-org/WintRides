import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionAuth";
import { createRiderSetupIntent } from "@/lib/payments";
import { getStripePublishableKey, isStripeConfigured } from "@/lib/stripe";

// POST /api/payments/setup-intent - create a reusable setup intent for the signed-in rider.
export async function POST(request: NextRequest) {
  try {
    const auth = await getSessionUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured yet. Add your Stripe keys to continue." },
        { status: 503 }
      );
    }

    const setupIntent = await createRiderSetupIntent(auth.user.id);

    return NextResponse.json(
      {
        clientSecret: setupIntent.client_secret,
        publishableKey: getStripePublishableKey(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating setup intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment setup session." },
      { status: 500 }
    );
  }
}
