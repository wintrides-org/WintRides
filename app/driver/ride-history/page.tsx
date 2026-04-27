"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { estimatePriceRange } from "@/lib/requestValidation";

type RideRequestRow = {
  id: string;
  status: "OPEN" | "MATCHED" | "COMPLETED" | "CANCELED" | "EXPIRED" | "DRAFT";
  type: "IMMEDIATE" | "SCHEDULED" | "GROUP";
  pickupLabel: string;
  dropoffLabel: string;
  pickupAt: string;
  partySize: number;
  carsNeeded: number;
};

const displayFont = { className: "font-heading" };

export default function DriverRideHistoryPage() {
  const [driverId, setDriverId] = useState<string>("");
  const [requests, setRequests] = useState<RideRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchSession() {
      try {
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch("/api/auth/session", {
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) setDriverId(data?.user?.id || "");
      } catch {
        if (!ignore) setDriverId("");
      }
    }

    fetchSession();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function fetchHistory() {
      setError("");
      try {
        if (!driverId) return;
        const res = await fetch(`/api/requests?status=COMPLETED&driverId=${driverId}`);
        if (!res.ok) throw new Error("Failed to load ride history.");
        const data = await res.json();
        if (!ignore) setRequests(data.requests || []);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load ride history.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (driverId) fetchHistory();
    return () => {
      ignore = true;
    };
  }, [driverId]);

  const formatted = useMemo(
    () =>
      requests.map((request) => ({
        ...request,
        pickupTime: new Date(request.pickupAt).toLocaleString([], {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        pay: estimatePriceRange(request.partySize).min,
      })),
    [requests]
  );

  return (
    <main className="page-shell px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="app-topbar brand-accent-top flex items-center justify-between gap-4 rounded-[28px] px-5 py-5">
          <Link
            href="/driver/dashboard"
            className="icon-button grid h-12 w-12 place-items-center border-2"
            aria-label="Back to driver dashboard"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div>
            <p className="eyebrow">Driver</p>
            <h1 className={`${displayFont.className} text-3xl text-[var(--primary)]`}>Ride History</h1>
            <p className="text-muted mt-1 text-sm">Completed rides you have finished.</p>
          </div>
          <span className="btn-secondary px-4 py-2 text-xs font-semibold">{requests.length} completed</span>
        </header>

        <section className="mt-8 space-y-4">
          {loading && (
            <div className="surface-panel text-muted rounded-2xl p-6 text-center text-sm">
              Loading ride history...
            </div>
          )}

          {!loading && error && (
            <div className="surface-panel rounded-2xl p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && formatted.length === 0 && (
            <div className="surface-panel text-muted rounded-2xl p-6 text-center text-sm">
              No completed rides yet.
            </div>
          )}

          {!loading && !error && formatted.length > 0 && (
            <div className="space-y-4">
              {formatted.map((request) => (
                <div key={request.id} className="surface-card rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--primary)]">
                        {request.dropoffLabel}
                      </h2>
                      <p className="text-muted mt-1 text-sm">{request.pickupTime}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      COMPLETED
                    </span>
                  </div>
                  <div className="mt-3 text-sm">
                    <span className="font-semibold">Pickup:</span> {request.pickupLabel}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                    <span>
                      <span className="font-semibold">Party size:</span> {request.partySize}
                    </span>
                    <span>
                      <span className="font-semibold">Cars needed:</span> {request.carsNeeded}
                    </span>
                    <span>
                      <span className="font-semibold">Pay:</span> ${request.pay}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
