import Stripe from "stripe";

/**
 * Throws a descriptive error when a required environment variable is missing.
 * We keep this helper centralized so all Stripe routes fail with consistent guidance.
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Add ${name} to your environment (example placeholder: ${name}=<YOUR_VALUE>).`
    );
  }
  return value;
}

/**
 * Creates and returns the Stripe client instance used by this app.
 * The Stripe SDK automatically uses the latest configured API version for the installed SDK.
 */
export function getStripeClient() {
  const secretKey = getRequiredEnv("STRIPE_SECRET_KEY");
  return new Stripe(secretKey);
}

/**
 * Reads base URL used to build return/success URLs for Stripe-hosted flows.
 */
export function getAppBaseUrl() {
  return getRequiredEnv("APP_BASE_URL");
}

/**
 * Reads webhook signing secret used to verify incoming webhook signatures.
 */
export function getStripeWebhookSecret() {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}
