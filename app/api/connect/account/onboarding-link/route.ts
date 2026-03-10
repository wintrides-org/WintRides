import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionAuth";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl, getStripeClient } from "@/lib/stripeClient";

/**
 * POST /api/connect/account/onboarding-link
 *
 * Creates a Stripe Account Link (V2) for Connect onboarding.
 */
export async function POST(request: NextRequest) {
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
          error:
            "No connected account mapping found. Create a connected account before onboarding.",
        },
        { status: 400 }
      );
    }

    const baseUrl = getAppBaseUrl();
    const stripeClient = getStripeClient();

    const accountLink = await stripeClient.v2.core.accountLinks.create({
      account: mapping.stripeAccountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          refresh_url: `${baseUrl}/driver/connect`,
          return_url: `${baseUrl}/driver/connect?accountId=${mapping.stripeAccountId}`,
        },
      },
    });

    return NextResponse.json(
      {
        accountId: mapping.stripeAccountId,
        url: accountLink.url,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create onboarding link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
