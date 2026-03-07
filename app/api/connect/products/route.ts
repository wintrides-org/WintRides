import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionAuth";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripeClient";

type CreateProductRequestBody = {
  name?: string;
  description?: string;
  priceInCents?: number;
  currency?: string;
  connectedAccountId?: string;
};

/**
 * GET /api/connect/products
 *
 * Returns all mapped products across all connected accounts for the storefront.
 */
export async function GET() {
  try {
    const stripeClient = getStripeClient();

    const mappings = await prisma.stripeProductMapping.findMany({
      include: {
        connectedAccount: {
          include: {
            user: {
              select: {
                id: true,
                userName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const storefrontProducts = await Promise.all(
      mappings.map(async (mapping) => {
        const product = await stripeClient.products.retrieve(mapping.stripeProductId);
        const price = await stripeClient.prices.retrieve(mapping.stripePriceId);
        return {
          stripeProductId: mapping.stripeProductId,
          stripePriceId: mapping.stripePriceId,
          name: product.name,
          description: product.description,
          currency: price.currency,
          unitAmount: price.unit_amount,
          connectedAccountId: mapping.connectedAccount.stripeAccountId,
          seller: {
            userId: mapping.connectedAccount.user.id,
            userName: mapping.connectedAccount.user.userName,
            email: mapping.connectedAccount.user.email,
          },
        };
      })
    );

    return NextResponse.json({ products: storefrontProducts }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list products.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/connect/products
 *
 * Creates a platform-level Stripe product and stores a mapping to one connected account.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getSessionUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as CreateProductRequestBody;
    const name = body.name?.trim();
    const description = body.description?.trim() || "";
    const priceInCents = Number(body.priceInCents);
    const currency = (body.currency || "usd").toLowerCase();
    const connectedAccountId = body.connectedAccountId?.trim();

    if (!name) {
      return NextResponse.json({ error: "Product name is required." }, { status: 400 });
    }
    if (!connectedAccountId) {
      return NextResponse.json(
        { error: "connectedAccountId is required." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(priceInCents) || priceInCents < 50) {
      return NextResponse.json(
        { error: "priceInCents must be an integer >= 50." },
        { status: 400 }
      );
    }

    const connectedAccount = await prisma.stripeConnectedAccount.findUnique({
      where: { stripeAccountId: connectedAccountId },
    });
    if (!connectedAccount) {
      return NextResponse.json(
        { error: "No local mapping found for the provided connected account ID." },
        { status: 404 }
      );
    }

    const stripeClient = getStripeClient();
    const product = await stripeClient.products.create({
      name,
      description,
      default_price_data: {
        unit_amount: priceInCents,
        currency,
      },
    });

    const defaultPrice =
      typeof product.default_price === "string" ? product.default_price : product.default_price?.id;

    if (!defaultPrice) {
      return NextResponse.json(
        {
          error:
            "Stripe product was created but default_price is missing. Check your Stripe account settings.",
        },
        { status: 500 }
      );
    }

    await prisma.stripeProductMapping.create({
      data: {
        stripeProductId: product.id,
        stripePriceId: defaultPrice,
        connectedAccountId: connectedAccount.id,
        createdByUserId: auth.user.id,
      },
    });

    return NextResponse.json(
      {
        productId: product.id,
        priceId: defaultPrice,
        connectedAccountId,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create product.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
