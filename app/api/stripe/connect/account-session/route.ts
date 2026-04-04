import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionAuth";
import { createDriverAccountSession } from "@/lib/payments";
import { getStripePublishableKey, isStripeConfigured } from "@/lib/stripe";

// POST /api/stripe/connect/account-session - mint a Connect embedded onboarding session for the signed-in driver.
export async function POST(request: NextRequest) {
  try {
    const auth = await getSessionUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!auth.user.driverInfo) {
      return NextResponse.json(
        { error: "Driver capability is required before payout onboarding can begin." },
        { status: 403 }
      );
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured yet. Add your Stripe keys to continue." },
        { status: 503 }
      );
    }

    const clientSecret = await createDriverAccountSession(auth.user.id);
    return NextResponse.json(
      {
        clientSecret,
        publishableKey: getStripePublishableKey(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating Stripe Connect account session:", error);
    return NextResponse.json(
      { error: "Failed to start driver onboarding." },
      { status: 500 }
    );
  }
}
