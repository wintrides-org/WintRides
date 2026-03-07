import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl, getStripeClient } from "@/lib/stripeClient";

type CreateCheckoutSessionRequestBody = {
  productId?: string;
  quantity?: number;
};

/**
 * POST /api/connect/checkout-session
 *
 * Creates a hosted Checkout Session that uses:
 * - destination charge (`transfer_data.destination`)
 * - application fee (`application_fee_amount`)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateCheckoutSessionRequestBody;
    const productId = body.productId?.trim();
    const quantity = Number(body.quantity ?? 1);

    if (!productId) {
      return NextResponse.json({ error: "productId is required." }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "quantity must be a positive integer." },
        { status: 400 }
      );
    }

    const mapping = await prisma.stripeProductMapping.findUnique({
      where: { stripeProductId: productId },
      include: { connectedAccount: true },
    });
    if (!mapping) {
      return NextResponse.json({ error: "Product mapping not found." }, { status: 404 });
    }

    const stripeClient = getStripeClient();
    const price = await stripeClient.prices.retrieve(mapping.stripePriceId);
    if (price.unit_amount === null) {
      return NextResponse.json(
        { error: "The selected price does not include a fixed unit amount." },
        { status: 400 }
      );
    }

    // Platform monetization model for this demo:
    // Riders pay once, the platform keeps a fee, and the remainder transfers to the connected account.
    const applicationFeeAmount = Math.round(price.unit_amount * quantity * 0.15);
    const baseUrl = getAppBaseUrl();

    const session = await stripeClient.checkout.sessions.create({
      line_items: [
        {
          price: mapping.stripePriceId,
          quantity,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: mapping.connectedAccount.stripeAccountId,
        },
      },
      mode: "payment",
      success_url: `${baseUrl}/connect/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/storefront`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a Checkout URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
