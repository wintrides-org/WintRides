/**
 * Driver Requests (MVP)
 *
 * Lists OPEN ride requests with filters and lets drivers accept a request.
 * Accept moves the request to Upcoming and shows a confirmation card.
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

export default function DriverRequestsPage() {
  const [driverId, setDriverId] = useState<string>("");
  const [requests, setRequests] = useState<RideRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptNotice, setAcceptNotice] = useState<string>("");
  const [dateFilter, setDateFilter] = useState("");
  const [timeStartFilter, setTimeStartFilter] = useState("");
  const [timeEndFilter, setTimeEndFilter] = useState("");
  const [payFilter, setPayFilter] = useState("ALL");

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
    let interval: NodeJS.Timeout | null = null;

    async function fetchRequests() {
      setError("");

      try {
        const res = await fetch("/api/requests?status=OPEN");
        if (!res.ok) {
          throw new Error("Failed to load requests.");
        }
        const data = await res.json();
        if (!ignore) {
          setRequests(data.requests || []);
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.message || "Failed to load requests.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    fetchRequests();
    interval = setInterval(fetchRequests, 10000);

    return () => {
      ignore = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  async function handleAccept(requestId: string) {
    setAcceptNotice("");
    setAcceptingId(requestId);

    try {
      if (!driverId) {
        throw new Error("Unable to confirm driver. Please sign in again.");
      }
      const res = await fetch("/api/requests/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, driverId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to accept request.");
      }
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      setAcceptNotice("Request accepted. It is now in your Upcoming Rides.");
    } catch (err: any) {
      setAcceptNotice(err?.message || "Failed to accept request.");
    } finally {
      setAcceptingId(null);
    }
  }

  const formatPickup = (pickupAt: string) =>
    new Date(pickupAt).toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formattedRequests = useMemo(
    () =>
      requests.map((request) => ({
        ...request,
        pickupTime: formatPickup(request.pickupAt),
        pay: estimatePriceRange(request.partySize).min,
      })),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    return formattedRequests.filter((request) => {
      const pickupDate = new Date(request.pickupAt);

      if (dateFilter) {
        const selected = new Date(dateFilter);
        const matchesDate =
          pickupDate.getFullYear() === selected.getFullYear() &&
          pickupDate.getMonth() === selected.getMonth() &&
          pickupDate.getDate() === selected.getDate();
        if (!matchesDate) return false;
      }

      if (timeStartFilter) {
        const [h, m] = timeStartFilter.split(":").map(Number);
        const start = new Date(pickupDate);
        start.setHours(h, m, 0, 0);
        if (pickupDate < start) return false;
      }

      if (timeEndFilter) {
        const [h, m] = timeEndFilter.split(":").map(Number);
        const end = new Date(pickupDate);
        end.setHours(h, m, 59, 999);
        if (pickupDate > end) return false;
      }

      switch (payFilter) {
        case "LT_10":
          return request.pay < 10;
        case "10_30":
          return request.pay >= 10 && request.pay <= 30;
        case "30_50":
          return request.pay >= 30 && request.pay <= 50;
        case "51_100":
          return request.pay >= 51 && request.pay <= 100;
        case "GT_100":
          return request.pay > 100;
        default:
          return true;
      }
    });
  }, [formattedRequests, dateFilter, timeStartFilter, timeEndFilter, payFilter]);

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
              Requests
            </h1>
            <p className="mt-1 text-sm text-[#6b5f52]">
              Open ride requests waiting for drivers.
            </p>
          </div>
          <span className="rounded-full border border-[#0a3570] bg-[#fdf7ef] px-4 py-2 text-xs font-semibold text-[#0a3570]">
            {requests.length} open
          </span>
        </header>

        <section className="mt-8 rounded-2xl border border-[#1e3a5f] bg-[#f7efe7] p-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-[#0a3570]">
                Filter by Pickup Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl border border-[#1e3a5f] bg-[#fdf9f3] p-2 text-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium text-[#0a3570]">
                Filter by Pay Range
              </label>
              <select
                value={payFilter}
                onChange={(e) => setPayFilter(e.target.value)}
                className="rounded-xl border border-[#1e3a5f] bg-[#fdf9f3] p-2 text-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
              >
                <option value="ALL">All</option>
                <option value="LT_10">$&lt;10</option>
                <option value="10_30">$10 - $30</option>
                <option value="30_50">$30 - $50</option>
                <option value="51_100">$51 - $100</option>
                <option value="GT_100">&gt;$100</option>
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-[#0a3570]">
                Filter by Pickup Time (Start)
              </label>
              <input
                type="time"
                value={timeStartFilter}
                onChange={(e) => setTimeStartFilter(e.target.value)}
                className="rounded-xl border border-[#1e3a5f] bg-[#fdf9f3] p-2 text-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium text-[#0a3570]">
                Filter by Pickup Time (End)
              </label>
              <input
                type="time"
                value={timeEndFilter}
                onChange={(e) => setTimeEndFilter(e.target.value)}
                className="rounded-xl border border-[#1e3a5f] bg-[#fdf9f3] p-2 text-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
              />
            </div>
          </div>
          {(dateFilter || timeStartFilter || timeEndFilter || payFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setDateFilter("");
                setTimeStartFilter("");
                setTimeEndFilter("");
                setPayFilter("ALL");
              }}
              className="mt-4 rounded-full border border-[#1e3a5f] px-4 py-1 text-sm font-medium text-[#0a3570] transition hover:bg-[#efe3d2]"
            >
              Clear filters
            </button>
          )}
        </section>

        <section className="mt-8 space-y-4">
          {acceptNotice ? (
            <div className="fixed bottom-6 right-6 z-50 max-w-xs rounded-2xl border-2 border-[#0a3570] bg-[#fdf7ef] p-4 text-sm text-[#0a1b3f] shadow-[0_14px_30px_rgba(10,27,63,0.2)]">
              <div className="flex items-start justify-between gap-3">
                <p>{acceptNotice}</p>
                <button
                  type="button"
                  onClick={() => setAcceptNotice("")}
                  className="rounded-full border border-[#0a3570] px-2 py-0.5 text-xs font-semibold text-[#0a3570]"
                  aria-label="Dismiss confirmation"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : null}
          {loading && (
            <div className="rounded-2xl border border-[#0a3570] bg-[#fdf7ef] p-6 text-center text-sm text-[#6b5f52]">
              Loading requests...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-[#0a3570] bg-[#fdf7ef] p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full border border-[#0a3570] px-4 py-1 text-xs font-semibold text-[#0a3570] hover:bg-[#efe3d2]"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filteredRequests.length === 0 && (
            <div className="rounded-2xl border border-[#0a3570] bg-[#fdf7ef] p-6 text-center text-sm text-[#6b5f52]">
              No open requests yet.
            </div>
          )}

          {!loading && !error && filteredRequests.length > 0 && (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  id={`request-${request.id}`}
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
                    <span className="rounded-full bg-[#dff5e1] px-3 py-1 text-xs font-semibold text-[#1a7f37]">
                      OPEN
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
                    <button
                      type="button"
                      onClick={() => handleAccept(request.id)}
                      disabled={acceptingId === request.id}
                      className="rounded-full border border-[#0a3570] bg-white px-4 py-1 text-xs font-semibold text-[#0a3570] hover:bg-[#efe3d2]"
                    >
                      {acceptingId === request.id ? "Accepting..." : "Accept"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-[#0a3570] bg-white px-4 py-1 text-xs font-semibold text-[#0a3570] hover:bg-[#efe3d2]"
                    >
                      View
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
