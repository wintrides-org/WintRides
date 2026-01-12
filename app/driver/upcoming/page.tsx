/**
 * Driver Upcoming Rides (MVP)
 *
 * Lists MATCHED rides for the signed-in driver.
 * Complete marks a ride as COMPLETED and shows a confetti confirmation.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Playfair_Display, Work_Sans } from "next/font/google";
import { estimatePriceRange } from "@/lib/requestValidation";

type RideRequestRow = {
  id: string;
  status: "OPEN" | "MATCHED" | "CANCELED" | "EXPIRED" | "DRAFT";
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

export default function DriverUpcomingPage() {
  const [driverId, setDriverId] = useState<string>("");
  const [requests, setRequests] = useState<RideRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completeNotice, setCompleteNotice] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);

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

    async function fetchUpcoming() {
      setError("");
      try {
        if (!driverId) return;
        const res = await fetch(`/api/requests?status=MATCHED&driverId=${driverId}`);
        if (!res.ok) {
          throw new Error("Failed to load upcoming rides.");
        }
        const data = await res.json();
        if (!ignore) {
          setRequests(data.requests || []);
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.message || "Failed to load upcoming rides.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (driverId) {
      fetchUpcoming();
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

  async function handleComplete(requestId: string, pay: number) {
    setCompleteNotice("");
    setCompletingId(requestId);

    try {
      if (!driverId) {
        throw new Error("Unable to confirm driver. Please sign in again.");
      }
      const res = await fetch("/api/requests/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, driverId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to complete ride.");
      }
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      setCompleteNotice(`You earned $${pay} for this trip!`);
    } catch (err: any) {
      setCompleteNotice(err?.message || "Failed to complete ride.");
    } finally {
      setCompletingId(null);
    }
  }

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
              Upcoming Rides
            </h1>
            <p className="mt-1 text-sm text-[#6b5f52]">
              Accepted rides waiting for pickup.
            </p>
          </div>
          <span className="rounded-full border border-[#0a3570] bg-[#fdf7ef] px-4 py-2 text-xs font-semibold text-[#0a3570]">
            {requests.length} upcoming
          </span>
        </header>

        <section className="mt-8 space-y-4">
          {completeNotice ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
              <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-[#0a3570] bg-[#fdf7ef] p-6 text-center shadow-[0_18px_40px_rgba(10,27,63,0.2)]">
                <div className="pointer-events-none absolute inset-0">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <span
                      key={`complete-confetti-${index}`}
                      className="absolute h-3 w-2 rounded-sm bg-[#800080]"
                      style={{
                        left: `${10 + index * 8}%`,
                        top: "-12%",
                        animationDelay: `${index * 0.1}s`,
                        animationDuration: "2s",
                      }}
                    />
                  ))}
                </div>
                <p className={`${displayFont.className} text-xl text-[#0a3570]`}>
                  {completeNotice}
                </p>
                <button
                  type="button"
                  onClick={() => setCompleteNotice("")}
                  className="mt-4 rounded-full border border-[#0a3570] px-4 py-1 text-xs font-semibold text-[#0a3570]"
                  aria-label="Dismiss confirmation"
                >
                  ✕
                </button>
                <style jsx>{`
                  span {
                    animation-name: confetti-fall;
                    animation-timing-function: ease-in;
                    animation-iteration-count: 1;
                    animation-fill-mode: forwards;
                  }
                  @keyframes confetti-fall {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(220px) rotate(220deg);
                      opacity: 0;
                    }
                  }
                  @media (prefers-reduced-motion: reduce) {
                    span {
                      animation: none;
                    }
                  }
                `}</style>
              </div>
            </div>
          ) : null}
          {loading && (
            <div className="rounded-2xl border border-[#0a3570] bg-[#fdf7ef] p-6 text-center text-sm text-[#6b5f52]">
              Loading upcoming rides...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-[#0a3570] bg-[#fdf7ef] p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && formatted.length === 0 && (
            <div className="rounded-2xl border border-[#0a3570] bg-[#fdf7ef] p-6 text-center text-sm text-[#6b5f52]">
              No upcoming rides yet.
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
                    <span className="rounded-full bg-[#d9e8ff] px-3 py-1 text-xs font-semibold text-[#0a3570]">
                      UPCOMING
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
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        request.pickupLabel
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[#0a3570] bg-white px-4 py-1 text-xs font-semibold text-[#0a3570] hover:bg-[#efe3d2]"
                    >
                      Navigate
                    </a>
                    <button
                      type="button"
                      onClick={() => handleComplete(request.id, request.pay)}
                      disabled={completingId === request.id}
                      className="rounded-full border border-[#0a3570] bg-white px-4 py-1 text-xs font-semibold text-[#0a3570] hover:bg-[#efe3d2] disabled:opacity-60"
                    >
                      {completingId === request.id ? "Completing..." : "Complete"}
                    </button>
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
