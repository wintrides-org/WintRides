/**
 * Driver Ride History (MVP)
 *
 * Shows COMPLETED rides for the signed-in driver.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Playfair_Display, Work_Sans } from "next/font/google";
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

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

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
          headers: sessionToken
            ? {
                Authorization: `Bearer ${sessionToken}`,
              }
            : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) {
          setDriverId(data?.user?.id || "");
        }
      } catch {
        if (!ignore) {
          setDriverId("");
        }
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
        if (!res.ok) {
          throw new Error("Failed to load ride history.");
        }
        const data = await res.json();
        if (!ignore) {
          setRequests(data.requests || []);
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.message || "Failed to load ride history.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (driverId) {
      fetchHistory();
    }

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
    <main
      className={`min-h-screen bg-[#f4ecdf] px-6 py-10 text-[#0a1b3f] ${bodyFont.className}`}
    >
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/driver/dashboard"
            className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
            aria-label="Back to driver dashboard"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div>
            <h1 className={`${displayFont.className} text-3xl text-[#0a3570]`}>
              Ride History
            </h1>
            <p className="mt-1 text-sm text-[#6b5f52]">
              Completed rides you’ve finished.
            </p>
          </div>
          <span className="rounded-full border border-[#0a3570] bg-[#fdf7ef] px-4 py-2 text-xs font-semibold text-[#0a3570]">
            {requests.length} completed
          </span>
        </header>

        <section className="mt-8 space-y-4">
          {loading && (
            <div className="rounded-2xl border border-[#0a3570] bg-[#fdf7ef] p-6 text-center text-sm text-[#6b5f52]">
              Loading ride history...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-[#0a3570] bg-[#fdf7ef] p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && formatted.length === 0 && (
            <div className="rounded-2xl border border-[#0a3570] bg-[#fdf7ef] p-6 text-center text-sm text-[#6b5f52]">
              No completed rides yet.
            </div>
          )}

          {!loading && !error && formatted.length > 0 && (
            <div className="space-y-4">
              {formatted.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border-2 border-[#0a3570] bg-[#fdf7ef] p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0a3570]">
                        {request.dropoffLabel}
                      </h2>
                      <p className="mt-1 text-sm text-[#6b5f52]">
                        {request.pickupTime}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#efe3d2] px-3 py-1 text-xs font-semibold text-[#6b5f52]">
                      COMPLETED
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-[#0a1b3f]">
                    <span className="font-semibold">Pickup:</span> {request.pickupLabel}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-[#0a1b3f]">
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
