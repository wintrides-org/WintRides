"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type AccountStatusResponse = {
  hasConnectedAccount: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  readyToReceivePayments: boolean;
  requirementsStatus: string | null;
  error?: string;
};

export default function DriverConnectPage() {
  const [status, setStatus] = useState<AccountStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const authHeaders = () => {
    const sessionToken = localStorage.getItem("sessionToken");
    return sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};
  };

  // Pulls live account state directly from Stripe via our backend.
  const loadStatus = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/connect/account/status", {
        headers: authHeaders(),
      });
      const body = (await res.json()) as AccountStatusResponse;
      if (!res.ok) {
        throw new Error(body.error || "Failed to load account status.");
      }
      setStatus(body);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to load account status.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Creates the connected account once and stores local user -> Stripe account mapping in DB.
  async function createConnectedAccount() {
    setWorking(true);
    setMessage("");
    try {
      const res = await fetch("/api/connect/account", {
        method: "POST",
        headers: authHeaders(),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to create connected account.");
      }
      setMessage(
        body.created
          ? "Connected account created. Continue to onboarding."
          : "Connected account already exists."
      );
      await loadStatus();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to create connected account.";
      setMessage(text);
    } finally {
      setWorking(false);
    }
  }

  // Generates a Stripe-hosted onboarding URL and redirects the driver there.
  async function startOnboarding() {
    setWorking(true);
    setMessage("");
    try {
      const res = await fetch("/api/connect/account/onboarding-link", {
        method: "POST",
        headers: authHeaders(),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to create onboarding link.");
      }
      window.location.href = body.url;
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to start onboarding.";
      setMessage(text);
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4ecdf] px-6 py-10 text-[#0a1b3f]">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">Driver</p>
          <h1 className="text-3xl font-semibold text-[#0a3570]">Connect onboarding</h1>
          <p className="text-sm text-[#6b5f52]">
            Set up payouts so riders can pay through WintRides and funds can transfer to your account.
          </p>
        </header>

        <section className="rounded-2xl border-2 border-[#0a3570] bg-white p-5">
          {loading ? (
            <p className="text-sm text-[#6b5f52]">Loading account status...</p>
          ) : (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Connected account:</span>{" "}
                {status?.hasConnectedAccount ? status.accountId : "Not created"}
              </p>
              <p>
                <span className="font-semibold">Requirements status:</span>{" "}
                {status?.requirementsStatus ?? "n/a"}
              </p>
              <p>
                <span className="font-semibold">Onboarding complete:</span>{" "}
                {status?.onboardingComplete ? "Yes" : "No"}
              </p>
              <p>
                <span className="font-semibold">Ready to receive payments:</span>{" "}
                {status?.readyToReceivePayments ? "Yes" : "No"}
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-wrap gap-3">
          {!status?.hasConnectedAccount ? (
            <button
              type="button"
              onClick={createConnectedAccount}
              disabled={working}
              className="rounded-full bg-[#0a3570] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {working ? "Creating..." : "Create Connected Account"}
            </button>
          ) : (
            <button
              type="button"
              onClick={startOnboarding}
              disabled={working}
              className="rounded-full bg-[#0a3570] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {working ? "Redirecting..." : "Onboard to collect payments"}
            </button>
          )}

          <button
            type="button"
            onClick={loadStatus}
            className="rounded-full border border-[#0a3570] px-5 py-2 text-sm font-semibold text-[#0a3570]"
          >
            Refresh status
          </button>
        </section>

        {message ? (
          <p className="rounded-xl border border-[#0a3570] bg-[#f8efe3] px-4 py-3 text-sm">{message}</p>
        ) : null}

        <section className="flex flex-wrap gap-3">
          <Link
            href="/driver/connect/products"
            className="rounded-full border border-[#0a3570] px-5 py-2 text-sm font-semibold text-[#0a3570]"
          >
            Manage products
          </Link>
          <Link
            href="/storefront"
            className="rounded-full border border-[#0a3570] px-5 py-2 text-sm font-semibold text-[#0a3570]"
          >
            Open rider storefront
          </Link>
        </section>
      </div>
    </main>
  );
}
