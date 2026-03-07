import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionAuth";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripeClient";

/**
 * GET /api/connect/account/status
 *
 * Returns live onboarding status from Stripe's Accounts API.
 * For demo accuracy, this route intentionally does not persist Stripe requirement states in DB.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const mapping = await prisma.stripeConnectedAccount.findUnique({
      where: { userId: auth.user.id },
    });
    if (!mapping) {
      return NextResponse.json(
        {
          hasConnectedAccount: false,
          onboardingComplete: false,
          readyToReceivePayments: false,
          requirementsStatus: "currently_due",
        },
        { status: 200 }
      );
    }

    const stripeClient = getStripeClient();
    const account = await stripeClient.v2.core.accounts.retrieve(mapping.stripeAccountId, {
      include: ["configuration.recipient", "requirements"],
    });

    const readyToReceivePayments =
      account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ===
      "active";

    const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status ?? null;
    const onboardingComplete =
      requirementsStatus !== "currently_due" && requirementsStatus !== "past_due";

    return NextResponse.json(
      {
        hasConnectedAccount: true,
        accountId: mapping.stripeAccountId,
        onboardingComplete,
        readyToReceivePayments,
        requirementsStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read connected account status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
