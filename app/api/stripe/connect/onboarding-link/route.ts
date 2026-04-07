import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionAuth";
import { createDriverOnboardingLink } from "@/lib/payments";
import { isStripeConfigured } from "@/lib/stripe";

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

    const origin = request.nextUrl.origin;
    const url = await createDriverOnboardingLink(auth.user.id, origin);
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Error creating Stripe onboarding link:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create onboarding link." },
      { status: 500 }
    );
  }
}
