"use client";

import { useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

type PaymentSummaryResponse = {
  summary: {
    rider: {
      hasSavedPaymentMethod: boolean;
      paymentMethodStatus: string;
      paymentMethodBrand?: string | null;
      paymentMethodLast4?: string | null;
      paymentMethodExpMonth?: number | null;
      paymentMethodExpYear?: number | null;
    };
    driver:
      | {
          hasDriverCapability: false;
        }
      | {
          hasDriverCapability: true;
          stripeConnectedAccountId?: string | null;
          onboardingComplete: boolean;
          chargesEnabled: boolean;
          payoutsEnabled: boolean;
        };
    latestPayments: Array<{
      id: string;
      rideRequestId: string;
      destination: string;
      pickupAt: string;
      status: string;
      amount: number;
      currency: string;
      lastPaymentError?: string | null;
    }>;
  };
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function toneClass(status: string) {
  if (["FAILED", "PAYMENT_METHOD_MISSING"].includes(status)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (["AUTHORIZED", "CAPTURED", "TRANSFERRED"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function RiderSetupForm({
  onSuccess,
}: {
  onSuccess: () => Promise<void> | void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Confirm the setup intent in place so the rider can stay on the same
      // account page after saving their reusable card.
      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });

      if (result.error) {
        throw new Error(result.error.message || "Unable to save payment method.");
      }

      const paymentMethodId =
        typeof result.setupIntent?.payment_method === "string"
          ? result.setupIntent.payment_method
          : result.setupIntent?.payment_method?.id;

      const syncResponse = await fetch("/api/payments/methods/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId }),
      });

      const syncBody = await syncResponse.json().catch(() => null);
      if (!syncResponse.ok) {
        throw new Error(syncBody?.error || "Unable to sync payment method.");
      }

      // The current SetupIntent is single-use. After a successful save, the
      // parent resets the setup session so any later "replace card" action
      // starts from a fresh client secret and a freshly mounted PaymentElement.
      await onSuccess();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to save payment method."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-panel space-y-4 rounded-2xl p-5">
      <div>
        <h3 className="text-base font-semibold text-[var(--primary)]">Add or replace payment method</h3>
        <p className="text-muted mt-1 text-sm">
          WintRides stores a reusable card on file so ride requests and carpools can authorize later.
        </p>
      </div>

      <PaymentElement />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="btn-primary px-5 py-3 text-sm disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save payment method"}
      </button>
    </form>
  );
}

export default function PaymentsClient() {
  const [summary, setSummary] = useState<PaymentSummaryResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");

  const stripePromise = useMemo(() => {
    return publishableKey ? loadStripe(publishableKey) : null;
  }, [publishableKey]);

  function resetSetupFlow() {
    setSetupClientSecret(null);
    setPublishableKey("");
  }

  async function fetchSummary() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/payments/summary");
      const body = (await response.json().catch(() => null)) as PaymentSummaryResponse | null;
      if (!response.ok || !body?.summary) {
        throw new Error((body as { error?: string } | null)?.error || "Failed to load payments.");
      }
      setSummary(body.summary);
    } catch (summaryError) {
      setError(
        summaryError instanceof Error ? summaryError.message : "Failed to load payments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSummary();
  }, []);

  async function handleStartSetup() {
    setSetupLoading(true);
    setError("");
    try {
      const response = await fetch("/api/payments/setup-intent", {
        method: "POST",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.clientSecret || !body?.publishableKey) {
        throw new Error(body?.error || "Unable to start payment setup.");
      }

      setSetupClientSecret(body.clientSecret);
      setPublishableKey(body.publishableKey);
    } catch (setupError) {
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Unable to start payment setup."
      );
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleStartDriverOnboarding() {
    setConnectLoading(true);
    setConnectError("");

    try {
      const response = await fetch("/api/stripe/connect/onboarding-link", {
        method: "POST",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.url) {
        throw new Error(body?.error || "Unable to start driver onboarding.");
      }

      window.location.assign(body.url);
    } catch (onboardingError) {
      setConnectError(
        onboardingError instanceof Error
          ? onboardingError.message
          : "Unable to start driver onboarding."
      );
    } finally {
      setConnectLoading(false);
    }
  }

  async function handleOpenStripeDashboard() {
    setConnectLoading(true);
    setConnectError("");

    try {
      const response = await fetch("/api/stripe/connect/login-link", {
        method: "POST",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.url) {
        throw new Error(body?.error || "Unable to open Stripe Express dashboard.");
      }

      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch (dashboardError) {
      setConnectError(
        dashboardError instanceof Error
          ? dashboardError.message
          : "Unable to open Stripe Express dashboard."
      );
    } finally {
      setConnectLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">
          Account
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Payments</h1>
        <p className="text-muted mt-2 text-sm">
          Manage the saved rider payment method and the driver payout onboarding flow in one place.
        </p>
      </header>

      {loading ? (
        <div className="surface-panel rounded-2xl border-dashed p-6 text-sm text-[var(--muted-foreground)]">
          Loading payment details...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : summary ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="surface-panel rounded-2xl p-5">
              <h2 className="text-base font-semibold text-[var(--primary)]">Rider payment readiness</h2>
              <p className="text-muted mt-2 text-sm">
                Riders must have a saved card before they can request a ride, create a carpool, or join a carpool.
              </p>

              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                {summary.rider.hasSavedPaymentMethod ? (
                  <>
                    <p className="text-sm font-semibold text-[var(--primary)]">
                      Card on file
                    </p>
                    <p className="text-muted mt-2 text-sm">
                      {summary.rider.paymentMethodBrand?.toUpperCase() || "CARD"} ending in{" "}
                      {summary.rider.paymentMethodLast4 || "----"}
                    </p>
                    <p className="text-muted mt-1 text-xs">
                      Expires {summary.rider.paymentMethodExpMonth || "--"}/
                      {summary.rider.paymentMethodExpYear || "--"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-[var(--primary)]">
                      No saved payment method yet
                    </p>
                    <p className="text-muted mt-2 text-sm">
                      Add one now so future ride requests can authorize automatically when the payment window opens.
                    </p>
                  </>
                )}
              </div>

              {!setupClientSecret ? (
                <button
                  type="button"
                  onClick={handleStartSetup}
                  disabled={setupLoading}
                  className="btn-primary mt-4 px-5 py-3 text-sm disabled:opacity-50"
                >
                  {setupLoading ? "Preparing..." : summary.rider.hasSavedPaymentMethod ? "Replace payment method" : "Add payment method"}
                </button>
              ) : stripePromise ? (
                <div className="mt-4">
                  <Elements
                    key={setupClientSecret}
                    stripe={stripePromise}
                    options={{ clientSecret: setupClientSecret }}
                  >
                    <RiderSetupForm
                      onSuccess={async () => {
                        await fetchSummary();
                        resetSetupFlow();
                      }}
                    />
                  </Elements>
                  <button
                    type="button"
                    onClick={resetSetupFlow}
                    className="btn-secondary mt-3 px-4 py-2 text-sm"
                  >
                    Cancel update
                  </button>
                </div>
              ) : null}
            </div>

            <div className="surface-panel rounded-2xl p-5">
              <h2 className="text-base font-semibold text-[var(--primary)]">Driver payouts</h2>
              <p className="text-muted mt-2 text-sm">
                Set up your payout account so WintRides can send your earnings after completed rides.
              </p>

              {summary.driver.hasDriverCapability ? (
                <>
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                    <p className="text-sm font-semibold text-[var(--primary)]">
                      {summary.driver.payoutsEnabled
                        ? "Payout setup complete"
                        : summary.driver.onboardingComplete
                          ? "Payout setup still in progress"
                          : "Payout setup not started"}
                    </p>
                    <div className="text-muted mt-3 grid gap-2 text-sm">
                      <p>Account linked: {summary.driver.stripeConnectedAccountId || "Not created yet"}</p>
                      <p>Ready to receive payouts: {summary.driver.payoutsEnabled ? "Yes" : "No"}</p>
                    </div>
                    {!summary.driver.payoutsEnabled ? (
                      <p className="text-muted mt-3 text-sm">
                        Stripe may still need additional information or review before payouts can be enabled.
                      </p>
                    ) : null}
                  </div>

                  <button
                  type="button"
                  onClick={handleStartDriverOnboarding}
                  disabled={connectLoading}
                  className="btn-primary mt-4 px-5 py-3 text-sm disabled:opacity-50"
                >
                    {connectLoading
                      ? "Launching..."
                      : summary.driver.onboardingComplete
                        ? "Review payout setup"
                        : "Start payout setup"}
                  </button>
                  <button
                  type="button"
                  onClick={handleOpenStripeDashboard}
                  disabled={connectLoading || !summary.driver.stripeConnectedAccountId}
                  className="btn-secondary mt-3 px-5 py-3 text-sm disabled:opacity-50"
                >
                  Open Stripe Express dashboard
                </button>

                  {connectError ? (
                    <p className="mt-3 text-sm text-red-600">{connectError}</p>
                  ) : null}
                </>
              ) : (
                <div className="text-muted mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm">
                  Driver payout onboarding appears once driver capability is enabled on the account.
                </div>
              )}
            </div>
          </section>

          <section className="surface-panel rounded-2xl p-5">
            <h2 className="text-base font-semibold text-[var(--primary)]">Recent payment activity</h2>

            <div className="mt-4 space-y-3">
              {summary.latestPayments.length === 0 ? (
                <div className="text-muted rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm">
                  No ride payment records yet.
                </div>
              ) : (
                summary.latestPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--primary)]">
                          {payment.destination}
                        </p>
                        <p className="text-muted mt-1 text-xs">
                          {new Date(payment.pickupAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                    <p className="text-muted mt-3 text-sm">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                    {payment.lastPaymentError ? (
                      <p className="mt-2 text-xs text-red-600">{payment.lastPaymentError}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
