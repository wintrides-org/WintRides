import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { estimatePriceRange } from "@/lib/requestValidation";
import { getStripe } from "@/lib/stripe";
import type { RidePaymentStatus, RequestType } from "@prisma/client";

const AUTHORIZATION_WINDOW_HOURS = 48;
const DEFAULT_PLATFORM_FEE_PERCENT = 0.15;
const DEFAULT_CANCELLATION_FEE_PERCENT = 0.1;

/**
 * Normalize the platform fee configuration into a decimal value that can be
 * applied to captured ride totals.
 */
function getPlatformFeePercent() {
  const configured = Number(process.env.PLATFORM_FEE_PERCENT ?? "");
  if (Number.isFinite(configured) && configured >= 0 && configured <= 1) {
    return configured;
  }
  if (Number.isFinite(configured) && configured > 1 && configured <= 100) {
    return configured / 100;
  }
  return DEFAULT_PLATFORM_FEE_PERCENT;
}

/**
 * Compute the rider-facing ride amount in cents from the same estimate helper
 * used by the request quote UI. This keeps the initial payment model aligned
 * with the existing quote logic instead of inventing a second price formula.
 */
export function calculateRideAmountCents(partySize: number) {
  return estimatePriceRange(partySize).min * 100;
}

/**
 * Compute the default cancellation fee in cents from an original ride amount.
 */
export function calculateCancellationFeeCents(amount: number) {
  return Math.round(amount * DEFAULT_CANCELLATION_FEE_PERCENT);
}

/**
 * Scheduled and group rides only authorize close to the trip to avoid losing
 * the authorization before the ride begins.
 */
export function getAuthorizationScheduleTime(pickupAt: Date) {
  return new Date(pickupAt.getTime() - AUTHORIZATION_WINDOW_HOURS * 60 * 60 * 1000);
}

/**
 * Immediate rides authorize as soon as the request is created. Scheduled/group
 * rides authorize when the ride enters the 48-hour window.
 */
export function shouldAuthorizeNow(type: RequestType, pickupAt: Date) {
  if (type === "IMMEDIATE") {
    return true;
  }
  return getAuthorizationScheduleTime(pickupAt).getTime() <= Date.now();
}

/**
 * Retrieve a request together with the payment rows needed to compute summary
 * messaging and financial transitions.
 */
export async function getRideRequestWithPayments(rideRequestId: string) {
  return prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
    include: {
      requester: true,
      acceptedDriver: true,
      payments: {
        orderBy: { createdAt: "asc" },
        include: {
          rider: true,
        },
      },
    },
  });
}

/**
 * Ensure the platform has a Stripe Customer for the rider before creating any
 * setup intents or payment intents.
 */
export async function ensureStripeCustomerForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found.");
  }

  const stripe = getStripe();

  if (user.stripeCustomerId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!existingCustomer.deleted) {
        return user;
      }
    } catch (error) {
      // If the stored customer belongs to a different Stripe account or no
      // longer exists, recreate it under the current key instead of failing
      // the entire payment-setup flow.
      const message = error instanceof Error ? error.message : "";
      if (!message.toLowerCase().includes("no such customer")) {
        throw error;
      }
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.userName,
    metadata: {
      userId: user.id,
    },
  });

  return prisma.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: customer.id,
    },
  });
}

/**
 * Attach the rider's reusable payment method details to the local user record
 * so account-level eligibility checks do not depend on a specific ride.
 */
export async function syncUserPaymentMethod(userId: string, paymentMethodId?: string | null) {
  const user = await ensureStripeCustomerForUser(userId);
  if (!user.stripeCustomerId) {
    throw new Error("Stripe customer is required before syncing payment methods.");
  }

  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(user.stripeCustomerId, {
    expand: ["invoice_settings.default_payment_method"],
  });

  if (customer.deleted) {
    throw new Error("Stripe customer was deleted.");
  }

  const selectedPaymentMethodId =
    paymentMethodId ??
    (typeof customer.invoice_settings.default_payment_method === "string"
      ? customer.invoice_settings.default_payment_method
      : customer.invoice_settings.default_payment_method?.id ?? null);

  if (!selectedPaymentMethodId) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        defaultPaymentMethodId: null,
        paymentMethodStatus: "NONE",
        paymentMethodBrand: null,
        paymentMethodLast4: null,
        paymentMethodExpMonth: null,
        paymentMethodExpYear: null,
      },
    });
    return null;
  }

  // Persist the chosen payment method as the customer's invoice default so all
  // future off-session authorizations use the same source of truth.
  await stripe.customers.update(user.stripeCustomerId, {
    invoice_settings: {
      default_payment_method: selectedPaymentMethodId,
    },
  });

  const paymentMethod = await stripe.paymentMethods.retrieve(selectedPaymentMethodId);
  const card = paymentMethod.card;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      defaultPaymentMethodId: paymentMethod.id,
      paymentMethodStatus: "READY",
      paymentMethodBrand: card?.brand ?? null,
      paymentMethodLast4: card?.last4 ?? null,
      paymentMethodExpMonth: card?.exp_month ?? null,
      paymentMethodExpYear: card?.exp_year ?? null,
    },
  });

  return paymentMethod;
}

/**
 * Create a setup intent for the signed-in rider so the frontend can collect a
 * reusable payment method with Stripe's Payment Element.
 */
export async function createRiderSetupIntent(userId: string) {
  const user = await ensureStripeCustomerForUser(userId);
  if (!user.stripeCustomerId) {
    throw new Error("Stripe customer is required before creating a setup intent.");
  }

  const stripe = getStripe();
  return stripe.setupIntents.create({
    customer: user.stripeCustomerId,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: {
      userId,
    },
  });
}

/**
 * Ensure a connected account exists for the driver, then keep the local
 * readiness fields in sync with Stripe's capability state.
 */
export async function ensureDriverConnectedAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driverInfo: true },
  });

  if (!user || !user.driverInfo) {
    throw new Error("Driver capability is required before starting payouts.");
  }

  const stripe = getStripe();
  let accountId = user.stripeConnectedAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId: user.id,
      },
    });

    accountId = account.id;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeConnectedAccountId: accountId,
      },
    });
  }

  return syncConnectedAccountStatus(userId);
}

/**
 * Pull the latest onboarding and payout readiness flags from Stripe so the UI
 * can show whether the driver is ready to be paid.
 */
export async function syncConnectedAccountStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driverInfo: true },
  });

  if (!user?.stripeConnectedAccountId) {
    throw new Error("Connected Stripe account is not configured for this driver.");
  }

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(user.stripeConnectedAccountId);

  return prisma.user.update({
    where: { id: user.id },
    data: {
      stripeConnectOnboardingComplete: Boolean(account.details_submitted),
      stripeConnectChargesEnabled: Boolean(account.charges_enabled),
      stripeConnectPayoutsEnabled: Boolean(account.payouts_enabled),
    },
  });
}

/**
 * Create an Account Session client secret for Stripe Connect embedded
 * onboarding. The frontend uses this to mount Stripe's onboarding component.
 */
export async function createDriverAccountSession(userId: string) {
  const user = await ensureDriverConnectedAccount(userId);
  if (!user.stripeConnectedAccountId) {
    throw new Error("Connected account is required before creating an account session.");
  }

  const stripe = getStripe();
  const session = await stripe.accountSessions.create({
    account: user.stripeConnectedAccountId,
    components: {
      account_onboarding: {
        enabled: true,
        features: {
          external_account_collection: true,
        },
      },
      notification_banner: {
        enabled: true,
      },
    },
  });

  return session.client_secret;
}

export async function createDriverOnboardingLink(userId: string, requestOrigin: string) {
  const user = await ensureDriverConnectedAccount(userId);
  if (!user.stripeConnectedAccountId) {
    throw new Error("Connected account is required before creating an onboarding link.");
  }

  const stripe = getStripe();
  const origin = requestOrigin.replace(/\/$/, "");
  const accountLink = await stripe.accountLinks.create({
    account: user.stripeConnectedAccountId,
    refresh_url: `${origin}/account/payments`,
    return_url: `${origin}/account/payments`,
    type: "account_onboarding",
  });

  return accountLink.url;
}

export async function createDriverDashboardLoginLink(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driverInfo: true },
  });

  if (!user?.driverInfo || !user.stripeConnectedAccountId) {
    throw new Error("Complete payout onboarding before opening the Stripe Express dashboard.");
  }

  const stripe = getStripe();
  const loginLink = await stripe.accounts.createLoginLink(user.stripeConnectedAccountId);
  return loginLink.url;
}

/**
 * Derive a single rider-facing summary from all payment rows tied to a ride.
 * This lets request and carpool UIs show a concise status without duplicating
 * payment-state logic in multiple pages.
 */
export function summarizeRidePayments(ridePayments: Array<{ status: RidePaymentStatus }>) {
  if (ridePayments.length === 0) {
    return {
      tone: "neutral" as const,
      label: "No payment records yet",
      detail: "Payment processing has not started for this ride yet.",
    };
  }

  const statuses = new Set(ridePayments.map((payment) => payment.status));
  if (statuses.has("FAILED") || statuses.has("PAYMENT_METHOD_MISSING")) {
    return {
      tone: "danger" as const,
      label: "Authorization needs attention",
      detail: "At least one rider still needs to fix payment details before the ride is financially confirmed.",
    };
  }
  if (statuses.has("AUTHORIZATION_SCHEDULED")) {
    return {
      tone: "info" as const,
      label: "Authorization scheduled",
      detail: "WintRides will authorize payment closer to the trip start time.",
    };
  }
  if (statuses.has("PENDING_AUTHORIZATION")) {
    return {
      tone: "info" as const,
      label: "Authorization pending",
      detail: "Payment authorization is in progress for this ride.",
    };
  }
  if (statuses.has("AUTHORIZED")) {
    return {
      tone: "success" as const,
      label: "Authorization complete",
      detail: "All required riders are authorized. Payment will be captured when the ride begins.",
    };
  }
  if (statuses.has("CAPTURED") || statuses.has("TRANSFER_PENDING") || statuses.has("TRANSFERRED")) {
    return {
      tone: "success" as const,
      label: "Payment captured",
      detail: "The ride payment has been captured and is moving through payout.",
    };
  }

  return {
    tone: "neutral" as const,
    label: "Payment status unavailable",
    detail: "Payment records exist, but the ride is not in a final authorization state yet.",
  };
}

/**
 * Create or refresh one RidePayment row per rider attached to the request.
 * Immediate rides move directly into authorization. Scheduled/group rides are
 * held in a scheduled state until the authorization window opens.
 */
export async function ensureRidePaymentsForRequest(input: {
  rideRequestId: string;
  riderIds: string[];
  carpoolId?: string | null;
}) {
  const request = await prisma.rideRequest.findUnique({
    where: { id: input.rideRequestId },
  });

  if (!request) {
    throw new Error("Ride request not found.");
  }

  const authorizationScheduledFor =
    shouldAuthorizeNow(request.type, request.pickupAt)
      ? null
      : getAuthorizationScheduleTime(request.pickupAt);

  const amount = request.quotedAmount || calculateRideAmountCents(request.partySize);

  for (const riderId of input.riderIds) {
    await prisma.ridePayment.upsert({
      where: {
        rideRequestId_riderId: {
          rideRequestId: request.id,
          riderId,
        },
      },
      update: {
        amount,
        currency: request.currency,
        carpoolId: input.carpoolId ?? null,
        authorizationScheduledFor,
        status: shouldAuthorizeNow(request.type, request.pickupAt)
          ? "PENDING_AUTHORIZATION"
          : "AUTHORIZATION_SCHEDULED",
      },
      create: {
        rideRequestId: request.id,
        riderId,
        carpoolId: input.carpoolId ?? null,
        amount,
        currency: request.currency,
        authorizationScheduledFor,
        status: shouldAuthorizeNow(request.type, request.pickupAt)
          ? "PENDING_AUTHORIZATION"
          : "AUTHORIZATION_SCHEDULED",
      },
    });
  }

  // Persist the next payment milestone on the request itself so list APIs can
  // expose a simple top-level status without reading child rows everywhere.
  await prisma.rideRequest.update({
    where: { id: request.id },
    data: {
      paymentAuthorizationDueAt: authorizationScheduledFor,
      quotedAmount: amount,
    },
  });
}

/**
 * Attempt authorization for any payment rows that are immediate or whose
 * scheduled window is now open.
 */
export async function processDueRideAuthorizations(rideRequestId: string) {
  const rideRequest = await getRideRequestWithPayments(rideRequestId);
  if (!rideRequest) {
    throw new Error("Ride request not found.");
  }

  for (const payment of rideRequest.payments) {
    const scheduledAt = payment.authorizationScheduledFor?.getTime() ?? 0;
    const shouldRun =
      payment.status === "PENDING_AUTHORIZATION" ||
      (payment.status === "AUTHORIZATION_SCHEDULED" && scheduledAt <= Date.now());

    if (shouldRun) {
      await authorizeRidePayment(payment.id);
    }
  }

  return refreshRidePaymentSummary(rideRequestId);
}

/**
 * Create a manual-capture PaymentIntent for a specific rider payment row.
 */
export async function authorizeRidePayment(ridePaymentId: string) {
  const ridePayment = await prisma.ridePayment.findUnique({
    where: { id: ridePaymentId },
    include: {
      rider: true,
      rideRequest: true,
    },
  });

  if (!ridePayment) {
    throw new Error("Ride payment not found.");
  }

  if (!ridePayment.rider.defaultPaymentMethodId || !ridePayment.rider.stripeCustomerId) {
    await prisma.ridePayment.update({
      where: { id: ridePayment.id },
      data: {
        status: "PAYMENT_METHOD_MISSING",
        lastPaymentError: "A saved payment method is required before authorization can run.",
      },
    });
    return null;
  }

  const stripe = getStripe();

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: ridePayment.amount,
      currency: ridePayment.currency,
      customer: ridePayment.rider.stripeCustomerId,
      payment_method: ridePayment.rider.defaultPaymentMethodId,
      capture_method: "manual",
      confirm: true,
      off_session: true,
      metadata: {
        ridePaymentId: ridePayment.id,
        rideRequestId: ridePayment.rideRequestId,
        riderId: ridePayment.riderId,
        carpoolId: ridePayment.carpoolId ?? "",
      },
      expand: ["latest_charge"],
    });

    const authorizationExpiresAt = extractAuthorizationExpiry(paymentIntent);
    const status =
      paymentIntent.status === "requires_capture" ? "AUTHORIZED" : "FAILED";

    await prisma.ridePayment.update({
      where: { id: ridePayment.id },
      data: {
        status,
        paymentIntentId: paymentIntent.id,
        authorizationExpiresAt,
        authorizedAt: paymentIntent.status === "requires_capture" ? new Date() : null,
        lastPaymentError: null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe failed to authorize the rider.";

    await prisma.ridePayment.update({
      where: { id: ridePayment.id },
      data: {
        status: "FAILED",
        lastPaymentError: message,
      },
    });
  }

  return prisma.ridePayment.findUnique({ where: { id: ridePayment.id } });
}

/**
 * Capture all authorized rider payments for the ride. This is intended to be
 * called at ride start when a start event exists in the product flow.
 */
export async function captureRidePaymentsForRequest(rideRequestId: string) {
  const rideRequest = await getRideRequestWithPayments(rideRequestId);
  if (!rideRequest) {
    throw new Error("Ride request not found.");
  }

  const stripe = getStripe();
  for (const payment of rideRequest.payments) {
    if (payment.status !== "AUTHORIZED" || !payment.paymentIntentId) {
      continue;
    }

    const paymentIntent = await stripe.paymentIntents.capture(payment.paymentIntentId);

    await prisma.ridePayment.update({
      where: { id: payment.id },
      data: {
        status: "CAPTURED",
        capturedAt: new Date(),
        capturedAmount: paymentIntent.amount_received || paymentIntent.amount,
      },
    });
  }

  return refreshRidePaymentSummary(rideRequestId);
}

/**
 * Transfer captured rider funds to the matched driver once the ride is
 * completed. The platform fee remains in the platform Stripe balance.
 */
export async function transferRidePayoutForRequest(rideRequestId: string) {
  const rideRequest = await getRideRequestWithPayments(rideRequestId);
  if (!rideRequest) {
    throw new Error("Ride request not found.");
  }
  if (!rideRequest.acceptedDriverId) {
    throw new Error("A matched driver is required before payout can be sent.");
  }

  const driver = await ensureDriverConnectedAccount(rideRequest.acceptedDriverId);
  if (!driver.stripeConnectedAccountId) {
    throw new Error("Driver payout account is not ready.");
  }

  const totalCaptured = rideRequest.payments.reduce((sum, payment) => {
    return sum + (payment.capturedAmount ?? 0);
  }, 0);

  if (totalCaptured <= 0) {
    return null;
  }

  const platformFeePercent = getPlatformFeePercent();
  const transferAmount = Math.max(0, Math.round(totalCaptured * (1 - platformFeePercent)));
  const stripe = getStripe();
  const transfer = await stripe.transfers.create({
    amount: transferAmount,
    currency: rideRequest.currency,
    destination: driver.stripeConnectedAccountId,
    metadata: {
      rideRequestId: rideRequest.id,
      driverId: rideRequest.acceptedDriverId,
    },
  });

  await prisma.ridePayment.updateMany({
    where: {
      rideRequestId: rideRequest.id,
      status: { in: ["CAPTURED", "TRANSFER_PENDING"] },
    },
    data: {
      status: "TRANSFERRED",
      transferAmount,
      transferId: transfer.id,
      transferredAt: new Date(),
    },
  });

  return refreshRidePaymentSummary(rideRequestId);
}

/**
 * Apply the rider cancellation policy to each payment row attached to a ride.
 * The function uses an existing authorization when available, otherwise it
 * falls back to an off-session charge against the saved payment method.
 */
export async function applyRiderCancellationPolicy(rideRequestId: string) {
  const rideRequest = await getRideRequestWithPayments(rideRequestId);
  if (!rideRequest) {
    throw new Error("Ride request not found.");
  }

  const shouldCharge =
    (rideRequest.type === "IMMEDIATE" && Boolean(rideRequest.acceptedDriverId)) ||
    (rideRequest.type !== "IMMEDIATE" &&
      Boolean(rideRequest.acceptedDriverId) &&
      rideRequest.pickupAt.getTime() - Date.now() <= 24 * 60 * 60 * 1000);

  if (!shouldCharge) {
    await cancelRidePayments(rideRequest.id);
    return refreshRidePaymentSummary(rideRequest.id);
  }

  const stripe = getStripe();

  for (const payment of rideRequest.payments) {
    const feeAmount = calculateCancellationFeeCents(payment.amount);

    if (payment.status === "AUTHORIZED" && payment.paymentIntentId) {
      const capturedIntent = await stripe.paymentIntents.capture(payment.paymentIntentId, {
        amount_to_capture: feeAmount,
      });
      await prisma.ridePayment.update({
        where: { id: payment.id },
        data: {
          status: "CAPTURED",
          cancellationFeeAmount: feeAmount,
          capturedAmount: capturedIntent.amount_received || feeAmount,
          capturedAt: new Date(),
        },
      });
      continue;
    }

    if (!payment.rider.defaultPaymentMethodId || !payment.rider.stripeCustomerId) {
      await prisma.ridePayment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          cancellationFeeAmount: feeAmount,
          lastPaymentError: "Unable to charge cancellation fee because no saved payment method is available.",
        },
      });
      continue;
    }

    const intent = await stripe.paymentIntents.create({
      amount: feeAmount,
      currency: payment.currency,
      customer: payment.rider.stripeCustomerId,
      payment_method: payment.rider.defaultPaymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        ridePaymentId: payment.id,
        rideRequestId: payment.rideRequestId,
        cancellationFee: "true",
      },
    });

    await prisma.ridePayment.update({
      where: { id: payment.id },
      data: {
        status: intent.status === "succeeded" ? "CAPTURED" : "FAILED",
        paymentIntentId: intent.id,
        cancellationFeeAmount: feeAmount,
        capturedAmount: intent.amount_received || feeAmount,
        capturedAt: intent.status === "succeeded" ? new Date() : null,
        lastPaymentError: intent.status === "succeeded" ? null : "Cancellation fee charge did not succeed.",
      },
    });
  }

  return refreshRidePaymentSummary(rideRequest.id);
}

/**
 * Release or mark uncaptured rider payments as canceled after a driver cancel
 * or a rider cancellation that should not incur a fee.
 */
export async function cancelRidePayments(rideRequestId: string) {
  const rideRequest = await getRideRequestWithPayments(rideRequestId);
  if (!rideRequest) {
    throw new Error("Ride request not found.");
  }

  const stripe = getStripe();
  for (const payment of rideRequest.payments) {
    if (payment.paymentIntentId && payment.status === "AUTHORIZED") {
      await stripe.paymentIntents.cancel(payment.paymentIntentId);
    }

    await prisma.ridePayment.update({
      where: { id: payment.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
      },
    });
  }
}

/**
 * Recompute the request-level payment readiness timestamp after one or more
 * ride payments change state.
 */
export async function refreshRidePaymentSummary(rideRequestId: string) {
  const rideRequest = await getRideRequestWithPayments(rideRequestId);
  if (!rideRequest) {
    throw new Error("Ride request not found.");
  }

  const allAuthorized = rideRequest.payments.length > 0 &&
    rideRequest.payments.every((payment) =>
      ["AUTHORIZED", "CAPTURE_PENDING", "CAPTURED", "TRANSFER_PENDING", "TRANSFERRED"].includes(payment.status)
    );

  await prisma.rideRequest.update({
    where: { id: rideRequest.id },
    data: {
      paymentReadyAt: allAuthorized ? new Date() : null,
    },
  });

  return {
    rideRequestId: rideRequest.id,
    paymentSummary: summarizeRidePayments(rideRequest.payments),
  };
}

/**
 * Populate a consistent response shape for the account/payments page.
 */
export async function getPaymentAccountSummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      driverInfo: true,
      ridePayments: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          rideRequest: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const latestPayments = user.ridePayments.map((payment) => ({
    id: payment.id,
    rideRequestId: payment.rideRequestId,
    destination: payment.rideRequest.dropoffLabel,
    pickupAt: payment.rideRequest.pickupAt.toISOString(),
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    lastPaymentError: payment.lastPaymentError,
  }));

  return {
    rider: {
      hasSavedPaymentMethod: user.paymentMethodStatus === "READY" && Boolean(user.defaultPaymentMethodId),
      paymentMethodStatus: user.paymentMethodStatus,
      defaultPaymentMethodId: user.defaultPaymentMethodId,
      paymentMethodBrand: user.paymentMethodBrand,
      paymentMethodLast4: user.paymentMethodLast4,
      paymentMethodExpMonth: user.paymentMethodExpMonth,
      paymentMethodExpYear: user.paymentMethodExpYear,
    },
    driver: user.driverInfo
      ? {
          hasDriverCapability: true,
          stripeConnectedAccountId: user.stripeConnectedAccountId,
          onboardingComplete: user.stripeConnectOnboardingComplete,
          chargesEnabled: user.stripeConnectChargesEnabled,
          payoutsEnabled: user.stripeConnectPayoutsEnabled,
        }
      : {
          hasDriverCapability: false,
        },
    latestPayments,
  };
}

/**
 * Create an initial payment record summary for rider-facing request APIs.
 */
export async function appendPaymentSummaryToRequests<T extends { id: string }>(requests: T[]) {
  const requestIds = requests.map((request) => request.id);
  if (requestIds.length === 0) {
    return [];
  }

  const payments = await prisma.ridePayment.findMany({
    where: { rideRequestId: { in: requestIds } },
    select: {
      rideRequestId: true,
      status: true,
      authorizationScheduledFor: true,
      lastPaymentError: true,
    },
  });

  return requests.map((request) => {
    const matching = payments.filter((payment) => payment.rideRequestId === request.id);
    const summary = summarizeRidePayments(matching);
    return {
      ...request,
      paymentSummary: summary,
      authorizationScheduledFor:
        matching.reduce<Date | null>((latest, payment) => {
          if (!payment.authorizationScheduledFor) {
            return latest;
          }
          if (!latest || payment.authorizationScheduledFor > latest) {
            return payment.authorizationScheduledFor;
          }
          return latest;
        }, null)?.toISOString() ?? null,
      paymentFailures: matching
        .filter((payment) => payment.lastPaymentError)
        .map((payment) => payment.lastPaymentError),
    };
  });
}

/**
 * Extract the authorization expiry timestamp from Stripe's expanded charge
 * details when card networks provide one.
 */
function extractAuthorizationExpiry(paymentIntent: Stripe.PaymentIntent) {
  if (!paymentIntent.latest_charge || typeof paymentIntent.latest_charge === "string") {
    return null;
  }

  const charge = paymentIntent.latest_charge;
  const captureBefore = charge.payment_method_details?.card?.capture_before;
  return captureBefore ? new Date(captureBefore * 1000) : null;
}

/**
 * Utility used by carpool flows to turn locked participants into rider IDs.
 */
export function getConfirmedParticipantIds(participants: Array<{ userId: string; confirmedAt?: string | Date | null }>) {
  return participants
    .filter((participant) => Boolean(participant.confirmedAt))
    .map((participant) => participant.userId);
}
