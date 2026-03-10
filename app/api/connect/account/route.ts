import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionAuth";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripeClient";

/**
 * POST /api/connect/account
 *
 * Creates a Stripe connected account (V2 API) for the signed-in user.
 * If a mapping already exists, returns the existing account to keep the flow idempotent.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getSessionUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const existing = await prisma.stripeConnectedAccount.findUnique({
      where: { userId: auth.user.id },
    });
    if (existing) {
      return NextResponse.json(
        {
          accountId: existing.stripeAccountId,
          created: false,
          message: "Connected account already exists for this user.",
        },
        { status: 200 }
      );
    }

    // Use `stripeClient` for all Stripe requests, as requested.
    const stripeClient = getStripeClient();

    // Only the approved V2 fields are included below (no top-level `type`).
    const account = await stripeClient.v2.core.accounts.create({
      display_name: auth.user.userName,
      contact_email: auth.user.email,
      identity: {
        country: "us",
      },
      dashboard: "express",
      defaults: {
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: {
                requested: true,
              },
            },
          },
        },
      },
    });

    await prisma.stripeConnectedAccount.create({
      data: {
        userId: auth.user.id,
        stripeAccountId: account.id,
      },
    });

    return NextResponse.json(
      {
        accountId: account.id,
        created: true,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create connected account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
