/**
 * Driver Dashboard (MVP)
 *
 * Shows driver profile, availability toggle, new ride requests, and ride summaries.
 * New ride requests pull the top 3 OPEN requests; Accept updates status to MATCHED.
 * Upcoming rides are fetched for the signed-in driver and summarized in "Your Rides."
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Playfair_Display, Work_Sans } from "next/font/google";
import { estimatePriceRange } from "@/lib/requestValidation";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mockPings = [
  {
    id: "ping-1",
    destination: "BDL",
    pickup: "Walmart",
    pickupTime: "2:45pm - 3:00pm",
    pay: "$12",
  },
  {
    id: "ping-2",
    destination: "NYC",
    pickup: "Campus Center",
    pickupTime: "5:10pm - 5:30pm",
    pay: "$28",
  },
  {
    id: "ping-3",
    destination: "Hartford",
    pickup: "Seelye Hall",
    pickupTime: "7:00pm - 7:20pm",
    pay: "$16",
  },
];

const confettiPieces = [
  { left: "8%", top: "-10%", delay: "0s", duration: "1.6s" },
  { left: "18%", top: "-15%", delay: "0.2s", duration: "1.9s" },
  { left: "28%", top: "-12%", delay: "0.4s", duration: "2.3s" },
  { left: "38%", top: "-18%", delay: "0.1s", duration: "1.8s" },
  { left: "48%", top: "-14%", delay: "0.3s", duration: "2.2s" },
  { left: "58%", top: "-16%", delay: "0.5s", duration: "2.0s" },
  { left: "68%", top: "-12%", delay: "0.15s", duration: "2.4s" },
  { left: "78%", top: "-20%", delay: "0.35s", duration: "2.1s" },
  { left: "88%", top: "-14%", delay: "0.25s", duration: "1.9s" },
];

export default function DriverDashboardPage() {
  const [driverId, setDriverId] = useState<string>("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [pingsOpen, setPingsOpen] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [openRequests, setOpenRequests] = useState<
    {
      id: string;
      pickupLabel: string;
      dropoffLabel: string;
      pickupAt: string;
      partySize: number;
      carsNeeded: number;
    }[]
  >([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [confirmCard, setConfirmCard] = useState<string>("");
  const [upcomingRequests, setUpcomingRequests] = useState<
    {
      id: string;
      pickupLabel: string;
      dropoffLabel: string;
      pickupAt: string;
      partySize: number;
    }[]
  >([]);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2000);
    return () => clearTimeout(timer);
  }, []);

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
      try {
        if (!driverId) return;
        const res = await fetch(
          `/api/requests?status=MATCHED&driverId=${driverId}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) {
          setUpcomingRequests(data.requests || []);
        }
      } catch {
        if (!ignore) {
          setUpcomingRequests([]);
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

  useEffect(() => {
    let ignore = false;
    let interval: NodeJS.Timeout | null = null;

    async function fetchOpenRequests() {
      try {
        const res = await fetch("/api/requests?status=OPEN");
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) {
          setOpenRequests((data.requests || []).slice(0, 3));
        }
      } catch {
        if (!ignore) {
          setOpenRequests([]);
        }
      }
    }

    fetchOpenRequests();
    interval = setInterval(fetchOpenRequests, 10000);

    return () => {
      ignore = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const formatPickupTime = (pickupAt: string) =>
    new Date(pickupAt).toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  async function handleAccept(requestId: string) {
    setConfirmCard("");
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
      setOpenRequests((prev) => prev.filter((req) => req.id !== requestId));
      setConfirmCard("Request accepted and moved to Upcoming Rides.");
    } catch (err: any) {
      setConfirmCard(err?.message || "Failed to accept request.");
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <main
      className={`min-h-screen bg-[#f4ecdf] px-6 py-10 text-[#0a1b3f] ${bodyFont.className}`}
    >
      <div className="mx-auto w-full max-w-6xl">
        {showIntro ? (
          <div className="relative mx-auto mt-12 w-full max-w-xl overflow-hidden rounded-3xl border-2 border-[#0a3570] bg-[#fdf7ef] px-8 py-10 text-center shadow-[0_18px_40px_rgba(10,27,63,0.15)]">
            <div className="pointer-events-none absolute inset-0">
              {confettiPieces.map((piece, index) => (
                <span
                  key={`confetti-${index}`}
                  className="absolute h-3 w-2 rounded-sm bg-[#800080]"
                  style={{
                    left: piece.left,
                    top: piece.top,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                  }}
                />
              ))}
            </div>
            <p className={`${displayFont.className} text-2xl text-[#0a3570]`}>
              Thank you, Olohi, for delivering safe rides to other students!
            </p>
            <p className="mt-3 text-sm text-[#6b5f52]">
              Loading your driver dashboard...
            </p>
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
                  transform: translateY(260px) rotate(220deg);
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
        ) : (
        <>
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
            aria-label="Back to dashboard"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>

          <div className="flex items-center gap-3 text-[#0a3570]">
            <Link
              href="/dashboard"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] hover:bg-[#e9dcc9]"
              aria-label="Profile"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c2.2-4 13.8-4 16 0" />
              </svg>
            </Link>
            <Link
              href="/in-progress"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] hover:bg-[#e9dcc9]"
              aria-label="Settings"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.5.9Z" />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] hover:bg-[#e9dcc9]"
              aria-label="Home"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10l9-7 9 7v11a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
              </svg>
            </Link>
            <Link
              href="/in-progress"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] hover:bg-[#e9dcc9]"
              aria-label="Help"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" />
                <circle cx="12" cy="17" r="1" />
              </svg>
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-3xl border-2 border-[#0a3570] bg-[#fdf7ef] p-5 text-center">
              <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-2xl border-2 border-[#0a3570] bg-[#f4ecdf]">
                <img
                  src="/driver_profile.png"
                  alt="Driver profile"
                  className="h-full w-full object-cover"
                />
                <span className="absolute -right-2 top-2 rounded bg-[#1dbf73] px-2 py-1 text-[10px] font-semibold text-white">
                  TOP RATED
                </span>
              </div>
              <h2 className={`${displayFont.className} mt-4 text-2xl text-[#0a3570]`}>
                Olohi John
              </h2>
              <div className="mt-3 flex items-center justify-center gap-1 text-[#f0b429]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <svg
                    key={`star-${index}`}
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M12 17.3l-6.2 3.7 1.7-7-5.5-4.8 7.2-.6L12 2l2.8 6.6 7.2.6-5.5 4.8 1.7 7z" />
                  </svg>
                ))}
              </div>
              <p className="mt-2 text-sm text-[#6b5f52]">Ratings & reviews</p>
              <Link
                href="/in-progress"
                className="mt-4 inline-flex rounded-full bg-[#9aa7b9] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(10,27,63,0.12)]"
              >
                View all reviews
              </Link>
            </div>

            <div className="rounded-3xl border-2 border-[#0a3570] bg-[#fdf7ef] p-5">
              <div
                className={`flex items-center justify-between gap-3 rounded-full border-2 border-[#0a3570] px-3 py-2 ${
                  isAvailable ? "bg-[#1dbf73]" : "bg-[#ff4b4b]"
                }`}
              >
                <span className="text-sm font-semibold text-[#0a3570]">Availability</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAvailable(false)}
                    className={`rounded-full px-4 py-1 text-sm font-semibold transition ${
                      isAvailable
                        ? "bg-transparent text-[#0a3570]"
                        : "bg-[#ff2d2d] text-white shadow-[0_6px_16px_rgba(0,0,0,0.15)]"
                    }`}
                  >
                    OFF
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAvailable(true)}
                    className={`rounded-full px-4 py-1 text-sm font-semibold transition ${
                      isAvailable
                        ? "bg-[#12b861] text-white shadow-[0_6px_16px_rgba(0,0,0,0.15)]"
                        : "bg-transparent text-[#0a3570]"
                    }`}
                  >
                    ON
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-[#6b5f52]">
                {isAvailable
                  ? "You are set to available. Expect pings for ride updates."
                  : "You are currently set to unavailable. Change status to receive request pings."}
              </p>
            </div>
          </aside>

          <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 px-1">
                <p className={`${displayFont.className} text-2xl text-[#0a3570]`}>
                  You earned $320 in the past week
                </p>
                <Link
                  href="/in-progress"
                  className="rounded-full bg-[#9aa7b9] px-6 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(10,27,63,0.12)]"
                >
                  View My Insights
                </Link>
              </div>

            <div className="overflow-hidden rounded-3xl border-2 border-[#0a3570] bg-[#fdf7ef]">
              <div className="flex items-center justify-between rounded-t-3xl bg-[#0a3570] px-5 py-3 text-sm font-semibold text-white">
                <button
                  type="button"
                  onClick={() => setPingsOpen((prev) => !prev)}
                  className="flex items-center gap-2"
                  aria-expanded={pingsOpen}
                >
                  New Ride Requests
                  <span
                    className={`transition-transform ${pingsOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>
                <Link
                  href="/driver/requests"
                  className="rounded-full border border-white/70 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  View All
                </Link>
              </div>
              {pingsOpen ? (
                <div className="rounded-b-3xl bg-[#d9b58c] px-5 py-4">
                  {isAvailable ? (
                    <div className="space-y-3">
                      {openRequests.map((ping) => (
                        <div
                          key={ping.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-[#0a3570] bg-[#f4ecdf] px-4 py-3"
                        >
                          <div className="text-sm text-[#0a1b3f]">
                            <span className="font-semibold">Destination:</span> {ping.dropoffLabel}
                            <span className="mx-2 text-[#0a3570]">•</span>
                            <span className="font-semibold">Pickup:</span> {ping.pickupLabel}
                            <span className="mx-2 text-[#0a3570]">•</span>
                            <span className="font-semibold">Pick-up time:</span> {formatPickupTime(ping.pickupAt)}
                            <span className="mx-2 text-[#0a3570]">•</span>
                            <span className="font-semibold">Pay:</span>{" "}
                            ${estimatePriceRange(ping.partySize).min}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAccept(ping.id)}
                              disabled={acceptingId === ping.id}
                              className="rounded-full border border-[#0a3570] bg-white px-4 py-1 text-xs font-semibold text-[#0a3570] hover:bg-[#efe3d2] disabled:opacity-60"
                            >
                              {acceptingId === ping.id ? "Accepting..." : "Accept"}
                            </button>
                            <Link
                              href={`/driver/requests#request-${ping.id}`}
                              className="rounded-full border border-[#0a3570] bg-white px-4 py-1 text-xs font-semibold text-[#0a3570] hover:bg-[#efe3d2]"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      ))}
                      {openRequests.length === 0 ? (
                        <p className="rounded-2xl border border-[#0a3570] bg-[#f4ecdf] px-4 py-4 text-center text-sm text-[#0a1b3f]">
                          No open ride requests yet.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-[#0a3570] bg-[#f4ecdf] px-4 py-4 text-center text-sm text-[#0a1b3f]">
                      Turn ON availability to see ride requests.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <section className="rounded-3xl border-2 border-[#0a3570] bg-[#fdf7ef] p-6">
              <h3 className={`${displayFont.className} text-xl text-[#0a3570]`}>
                Your Rides
              </h3>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link
                  href="/driver/ride-history"
                  className="rounded-full bg-[#0a3570] px-6 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(10,27,63,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0a2d5c]"
                >
                  View Ride History
                </Link>
                <Link
                  href="/driver/upcoming"
                  className="rounded-full bg-[#0a3570] px-6 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(10,27,63,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0a2d5c]"
                >
                  View Upcoming Rides
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {upcomingRequests.length === 0 ? (
                  <p className="text-sm text-[#6b5f52]">
                    No upcoming rides yet.
                  </p>
                ) : (
                  upcomingRequests.slice(0, 2).map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0a3570] bg-[#f4ecdf] px-4 py-3"
                    >
                      <div className="text-sm text-[#0a1b3f]">
                        <span className="font-semibold">{request.dropoffLabel}</span>
                        <span className="mx-2 text-[#0a3570]">•</span>
                        <span>{formatPickupTime(request.pickupAt)}</span>
                        <span className="mx-2 text-[#0a3570]">•</span>
                        <span className="font-semibold">Pickup:</span> {request.pickupLabel}
                      </div>
                      <span className="rounded-full bg-[#d9e8ff] px-3 py-1 text-xs font-semibold text-[#0a3570]">
                        UPCOMING
                      </span>
                      <Link
                        href="/driver/upcoming"
                        className="rounded-full border border-[#0a3570] bg-white px-3 py-1 text-xs font-semibold text-[#0a3570] hover:bg-[#efe3d2]"
                      >
                        View
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </section>


            <section className="overflow-hidden rounded-3xl border-2 border-[#0a3570] bg-[#fdf7ef]">
              <button
                type="button"
                onClick={() => setPaymentOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-t-3xl bg-[#0a3570] px-5 py-3 text-left text-sm font-semibold text-white"
                aria-expanded={paymentOpen}
              >
                Payment Information
                <span
                  className={`transition-transform ${paymentOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>
              {paymentOpen ? (
                <div className="bg-[#d9b58c] px-5 py-4">
                  <div className="grid gap-3 text-sm text-[#0a1b3f]">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-24 font-semibold">Name</span>
                      <span className="flex-1 tracking-[0.3em] text-[#6b5f52]">Olohi John</span>
                      <button type="button" className="text-[#0a3570]" aria-label="Edit name">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-24 font-semibold">Acct number</span>
                      <span className="flex-1 tracking-[0.3em] text-[#6b5f52]">************8876</span>
                      <button type="button" className="text-[#0a3570]" aria-label="Edit account number">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-24 font-semibold">Pin</span>
                      <span className="flex-1 tracking-[0.3em] text-[#6b5f52]">***</span>
                      <button type="button" className="text-[#0a3570]" aria-label="Edit pin">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </section>
        </>
        )}
      </div>
      {confirmCard ? (
        <div className="fixed bottom-6 right-6 z-50 max-w-xs rounded-2xl border-2 border-[#0a3570] bg-[#fdf7ef] p-4 shadow-[0_14px_30px_rgba(10,27,63,0.2)]">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-[#0a1b3f]">{confirmCard}</p>
            <button
              type="button"
              onClick={() => setConfirmCard("")}
              className="rounded-full border border-[#0a3570] px-2 py-0.5 text-xs font-semibold text-[#0a3570]"
              aria-label="Dismiss confirmation"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
