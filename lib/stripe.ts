import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/**
 * Return the configured Stripe secret key, or an empty string when the app is
 * still using the sample placeholder.
 */
export function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  return key.startsWith("sk_") && !key.includes("<REPLACE") ? key : "";
}

/**
 * Return the publishable key used by Stripe.js on client pages.
 */
export function getStripePublishableKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  return key.startsWith("pk_") && !key.includes("<REPLACE") ? key : "";
}

/**
 * Stripe-backed pages should degrade cleanly when credentials are missing in
 * development. This helper makes that decision explicit.
 */
export function isStripeConfigured() {
  return Boolean(getStripeSecretKey() && getStripePublishableKey());
}

/**
 * Lazily construct a single Stripe SDK instance for the server runtime.
 */
export function getStripe() {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to continue.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}
