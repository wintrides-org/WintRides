import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { syncConnectedAccountStatus, syncUserPaymentMethod } from "@/lib/payments";
import { getStripe, getStripeSecretKey } from "@/lib/stripe";

// POST /api/stripe/webhooks - reconcile Stripe events back into local payment and payout records.
export async function POST(request: NextRequest) {
  const platformWebhookSecret = normalizeWebhookSecret(process.env.STRIPE_WEBHOOK_SECRET);
  const connectWebhookSecret = normalizeWebhookSecret(process.env.STRIPE_CONNECT_WEBHOOK_SECRET);

  if (!getStripeSecretKey() || (!platformWebhookSecret && !connectWebhookSecret)) {
    return NextResponse.json(
      {
        error:
          "Stripe webhook secrets are not configured. Add STRIPE_WEBHOOK_SECRET and, for Connect, STRIPE_CONNECT_WEBHOOK_SECRET.",
      },
      { status: 503 }
    );
  }

  try {
    const stripe = getStripe();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing Stripe signature." },
        { status: 400 }
      );
    }

    const payload = await request.text();
    const { event, source } = constructVerifiedStripeEvent({
      stripe,
      payload,
      signature,
      platformWebhookSecret,
      connectWebhookSecret,
    });

    switch (event.type) {
      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;
      case "payment_intent.amount_capturable_updated":
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
        await handlePaymentIntentEvent(event.data.object as Stripe.PaymentIntent);
        break;
      case "account.updated":
        // account.updated is expected from a Connect webhook source. We still
        // allow it here even if the event verifies against the platform secret
        // so local development remains flexible.
        await handleAccountUpdated(event.data.object as Stripe.Account, source);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    return NextResponse.json(
      { error: "Failed to process Stripe webhook." },
      { status: 400 }
    );
  }
}

/**
 * Normalize webhook secrets so placeholder values are treated as missing.
 */
function normalizeWebhookSecret(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed && !trimmed.includes("<REPLACE") ? trimmed : "";
}

/**
 * Verify the incoming event against the configured platform and Connect
 * signing secrets. This allows one route to safely receive both webhook
 * sources while keeping their secrets separate in env.
 */
function constructVerifiedStripeEvent(input: {
  stripe: Stripe;
  payload: string;
  signature: string;
  platformWebhookSecret: string;
  connectWebhookSecret: string;
}) {
  const verificationAttempts: Array<{ secret: string; source: "platform" | "connect" }> = [];

  if (input.platformWebhookSecret) {
    verificationAttempts.push({
      secret: input.platformWebhookSecret,
      source: "platform",
    });
  }

  if (input.connectWebhookSecret) {
    verificationAttempts.push({
      secret: input.connectWebhookSecret,
      source: "connect",
    });
  }

  let lastError: unknown = null;

  for (const attempt of verificationAttempts) {
    try {
      return {
        event: input.stripe.webhooks.constructEvent(
          input.payload,
          input.signature,
          attempt.secret
        ),
        source: attempt.source,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to verify Stripe webhook signature.");
}

/**
 * Setup intent success means the rider now has a reusable payment method that
 * can be used for future off-session ride authorizations.
 */
async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  const userId = setupIntent.metadata?.userId;
  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;

  if (!userId || !paymentMethodId) {
    return;
  }

  await syncUserPaymentMethod(userId, paymentMethodId);
}

/**
 * Payment intent webhooks keep local ride-payment rows aligned with Stripe's
 * asynchronous lifecycle, especially around failures and capture completion.
 */
async function handlePaymentIntentEvent(paymentIntent: Stripe.PaymentIntent) {
  const ridePaymentId = paymentIntent.metadata?.ridePaymentId;
  if (!ridePaymentId) {
    return;
  }

  const nextState =
    paymentIntent.status === "requires_capture"
      ? {
          status: "AUTHORIZED" as const,
          authorizedAt: new Date(),
          capturedAt: null,
          capturedAmount: null,
          lastPaymentError: null,
        }
      : paymentIntent.status === "succeeded"
        ? {
            status: "CAPTURED" as const,
            authorizedAt: null,
            capturedAt: new Date(),
            capturedAmount: paymentIntent.amount_received || paymentIntent.amount,
            lastPaymentError: null,
          }
        : paymentIntent.status === "canceled"
          ? {
              status: "CANCELED" as const,
              authorizedAt: null,
              capturedAt: null,
              capturedAmount: null,
              lastPaymentError: null,
            }
          : {
              status: "FAILED" as const,
              authorizedAt: null,
              capturedAt: null,
              capturedAmount: null,
              lastPaymentError:
                paymentIntent.last_payment_error?.message ??
                "Stripe reported a payment failure for this ride.",
            };

  await prisma.ridePayment.update({
    where: { id: ridePaymentId },
    data: {
      paymentIntentId: paymentIntent.id,
      status: nextState.status,
      authorizedAt: nextState.authorizedAt,
      capturedAt: nextState.capturedAt,
      capturedAmount: nextState.capturedAmount,
      lastPaymentError: nextState.lastPaymentError,
    },
  });
}

/**
 * Driver onboarding status is sourced from the connected account record itself.
 */
async function handleAccountUpdated(
  account: Stripe.Account,
  source: "platform" | "connect"
) {
  // account.updated is primarily useful when it comes from a connected account
  // webhook configuration, because that is what tracks driver onboarding state.
  if (source !== "connect") {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { stripeConnectedAccountId: account.id },
    select: { id: true },
  });

  if (!user) {
    return;
  }

  await syncConnectedAccountStatus(user.id);
}
