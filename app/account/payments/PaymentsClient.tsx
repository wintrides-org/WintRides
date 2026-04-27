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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[#0a3570]/20 bg-white p-5">
      <div>
        <h3 className="text-base font-semibold text-[#0a3570]">Add or replace payment method</h3>
        <p className="mt-1 text-sm text-[#6b5f52]">
          WintRides stores a reusable card on file so ride requests and carpools can authorize later.
        </p>
      </div>

      <PaymentElement />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="rounded-full bg-[#0a3570] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(10,27,63,0.2)] transition hover:bg-[#0a2d5c] disabled:opacity-50"
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
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5f52]">
          Account
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Payments</h1>
        <p className="mt-2 text-sm text-[#6b5f52]">
          Manage the saved rider payment method and the driver payout onboarding flow in one place.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-6 text-sm text-[#6b5f52]">
          Loading payment details...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : summary ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#0a3570]/20 bg-white/80 p-5">
              <h2 className="text-base font-semibold text-[#0a3570]">Rider payment readiness</h2>
              <p className="mt-2 text-sm text-[#6b5f52]">
                Riders must have a saved card before they can request a ride, create a carpool, or join a carpool.
              </p>

              <div className="mt-4 rounded-2xl border border-[#0a3570]/10 bg-[#f8efe3] p-4">
                {summary.rider.hasSavedPaymentMethod ? (
                  <>
                    <p className="text-sm font-semibold text-[#0a3570]">
                      Card on file
                    </p>
                    <p className="mt-2 text-sm text-[#6b5f52]">
                      {summary.rider.paymentMethodBrand?.toUpperCase() || "CARD"} ending in{" "}
                      {summary.rider.paymentMethodLast4 || "----"}
                    </p>
                    <p className="mt-1 text-xs text-[#6b5f52]">
                      Expires {summary.rider.paymentMethodExpMonth || "--"}/
                      {summary.rider.paymentMethodExpYear || "--"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-[#0a3570]">
                      No saved payment method yet
                    </p>
                    <p className="mt-2 text-sm text-[#6b5f52]">
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
                  className="mt-4 rounded-full bg-[#0a3570] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(10,27,63,0.2)] transition hover:bg-[#0a2d5c] disabled:opacity-50"
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
                    className="mt-3 rounded-full border border-[#0a3570] px-4 py-2 text-sm font-semibold text-[#0a3570] hover:bg-[#efe3d2]"
                  >
                    Cancel update
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[#0a3570]/20 bg-white/80 p-5">
              <h2 className="text-base font-semibold text-[#0a3570]">Driver payouts</h2>
              <p className="mt-2 text-sm text-[#6b5f52]">
                Set up your payout account so WintRides can send your earnings after completed rides.
              </p>

              {summary.driver.hasDriverCapability ? (
                <>
                  <div className="mt-4 rounded-2xl border border-[#0a3570]/10 bg-[#f8efe3] p-4">
                    <p className="text-sm font-semibold text-[#0a3570]">
                      {summary.driver.payoutsEnabled
                        ? "Payout setup complete"
                        : summary.driver.onboardingComplete
                          ? "Payout setup still in progress"
                          : "Payout setup not started"}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-[#6b5f52]">
                      <p>Account linked: {summary.driver.stripeConnectedAccountId || "Not created yet"}</p>
                      <p>Ready to receive payouts: {summary.driver.payoutsEnabled ? "Yes" : "No"}</p>
                    </div>
                    {!summary.driver.payoutsEnabled ? (
                      <p className="mt-3 text-sm text-[#6b5f52]">
                        Stripe may still need additional information or review before payouts can be enabled.
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={handleStartDriverOnboarding}
                    disabled={connectLoading}
                    className="mt-4 rounded-full bg-[#0a3570] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(10,27,63,0.2)] transition hover:bg-[#0a2d5c] disabled:opacity-50"
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
                    className="mt-3 rounded-full border border-[#0a3570] px-5 py-3 text-sm font-semibold text-[#0a3570] hover:bg-[#efe3d2] disabled:opacity-50"
                  >
                    Open Stripe Express dashboard
                  </button>

                  {connectError ? (
                    <p className="mt-3 text-sm text-red-600">{connectError}</p>
                  ) : null}
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[#0a3570]/30 bg-[#f8efe3] p-4 text-sm text-[#6b5f52]">
                  Driver payout onboarding appears once driver capability is enabled on the account.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#0a3570]/20 bg-white/80 p-5">
            <h2 className="text-base font-semibold text-[#0a3570]">Recent payment activity</h2>

            <div className="mt-4 space-y-3">
              {summary.latestPayments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#0a3570]/30 bg-[#f8efe3] p-4 text-sm text-[#6b5f52]">
                  No ride payment records yet.
                </div>
              ) : (
                summary.latestPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-2xl border border-[#0a3570]/10 bg-[#f8efe3] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0a3570]">
                          {payment.destination}
                        </p>
                        <p className="mt-1 text-xs text-[#6b5f52]">
                          {new Date(payment.pickupAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[#6b5f52]">
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
