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
import { estimatePriceRange } from "@/lib/requestValidation";
import PaymentsSupportMessage from "@/components/PaymentsSupportMessage";
import BrandMark from "@/components/BrandMark";
import DashboardUtilityNav from "@/components/DashboardUtilityNav";

const displayFont = { className: "font-heading" };
const TOP_RATED_MIN_RATING = 4.8;
const TOP_RATED_MIN_REVIEWS = 5;
// Mock alerts on the driver's profile: has been replaced with real requests
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

// confetti pieces for the welcome intro page
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

// determines how long a confirmation card should persist for after the ride is canceled by the driver 
const CANCELED_CARD_VISIBILITY_MS = 30 * 60 * 1000;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getInitials(name: string, fallback: string): string {
  const source = (name || fallback).trim();
  if (!source) return "WR";

  const letters = source
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return letters || "WR";
}

export default function DriverDashboardPage() {
  // initializes driverId, Availability Status, Pings, Payment collapsible tabs, Requests status, and showIntro status
  const [driverId, setDriverId] = useState<string>("");
  const [driverUserName, setDriverUserName] = useState<string>("");
  const [driverName, setDriverName] = useState<string>("");
  const [driverRating, setDriverRating] = useState(0);
  const [driverReviewsCount, setDriverReviewsCount] = useState(0);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isAvailabilityUpdating, setIsAvailabilityUpdating] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [licenseStatus, setLicenseStatus] = useState<"valid" | "expiringSoon" | "expired" | "missing" | null>(null); // Track current license state for reminders.
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null); // Cache days remaining so UI can show "Expires in X days".
  const [showExpiredModal, setShowExpiredModal] = useState(false); // Show modal when an expired driver tries to toggle ON.
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
      paymentSummary?: {
        tone: "neutral" | "info" | "success" | "danger";
        label: string;
        detail: string;
      };
    }[]
  >([]);
  // initializes accept status of a request, confirm status, and what upcoming requests should be shown as
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [confirmCard, setConfirmCard] = useState<string>("");
  const [stripePayoutReady, setStripePayoutReady] = useState(false);
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false);
  const [upcomingRequests, setUpcomingRequests] = useState<
    {
      id: string;
      status: "MATCHED" | "CANCELED"; // displays rides matched with the driver, including ones that just got canceled
      pickupLabel: string;
      dropoffLabel: string;
      pickupAt: string;
      partySize: number;
      canceledAt?: string | null;
      paymentSummary?: {
        tone: "neutral" | "info" | "success" | "danger";
        label: string;
        detail: string;
      };
    }[]
  >([]);
  const driverInitials = getInitials(driverName, driverUserName);
  const isTopRated =
    driverRating >= TOP_RATED_MIN_RATING &&
    driverReviewsCount >= TOP_RATED_MIN_REVIEWS;

  // Shows intro page
  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2000);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    let ignore = false;

    // Load the current session to identify the signed-in driver.
    async function fetchSession() {
      try {
        const sessionToken = localStorage.getItem("sessionToken");
        // Session API accepts the token via Authorization header for MVP.
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
          // Store driver ID to use in later API calls.
          const nextDriverId = data?.user?.id || "";
          setDriverId(nextDriverId);
          setDriverUserName(data?.user?.userName || "");
          setDriverName(data?.user?.driverLegalName || "");
          // Seed availability from the server so UI matches persisted state.
          setIsAvailable(Boolean(data?.user?.isDriverAvailable));
          setStripePayoutReady(Boolean(data?.user?.stripeConnectPayoutsEnabled));
          setStripeOnboardingComplete(Boolean(data?.user?.stripeConnectOnboardingComplete));

          // Load the driver's own public rating summary for the profile card.
          if (nextDriverId) {
            try {
              const profileRes = await fetch(`/api/users/${nextDriverId}`, {
                headers: sessionToken
                  ? {
                      Authorization: `Bearer ${sessionToken}`,
                    }
                  : {},
              });
              if (profileRes.ok) {
                const profileData = await profileRes.json().catch(() => null);
                setDriverRating(Number(profileData?.user?.rating || 0));
                setDriverReviewsCount(Number(profileData?.user?.reviewsCount || 0));
              }
            } catch {
              setDriverRating(0);
              setDriverReviewsCount(0);
            }
          }
        }
      } catch {
        if (!ignore) {
          setDriverId("");
          setDriverUserName("");
          setDriverRating(0);
          setDriverReviewsCount(0);
          setIsAvailable(false);
          setStripePayoutReady(false);
          setStripeOnboardingComplete(false);
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

    async function fetchLicenseStatus() {
      try {
        const sessionToken = localStorage.getItem("sessionToken");
        if (!sessionToken) return;
        const res = await fetch("/api/driver/license-status", {
          headers: { Authorization: `Bearer ${sessionToken}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) {
          setLicenseStatus(data?.licenseStatus ?? null);
          setDaysRemaining(
            typeof data?.daysRemaining === "number" ? data.daysRemaining : null
          );
        }
      } catch {
        if (!ignore) {
          setLicenseStatus(null);
          setDaysRemaining(null);
        }
      }
    }

    fetchLicenseStatus(); // Initial fetch on mount.
    interval = setInterval(fetchLicenseStatus, 4 * 60 * 60 * 1000); // Periodic refresh (every 4 hours).

    // Refresh when the tab/window regains focus so the banner is always up to date.
    function handleFocus() {
      if (document.visibilityState === "visible") {
        fetchLicenseStatus();
      }
    }
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      ignore = true;
      if (interval) {
        clearInterval(interval);
      }
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    let interval: NodeJS.Timeout | null = null;

    // Fetch upcoming rides for this driver after we know their ID.
    async function fetchUpcoming() {
      try {
        if (!driverId) return;
        const res = await fetch(
          `/api/requests?status=MATCHED,CANCELED&driverId=${driverId}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) {
          const recentDriverRides = Array.isArray(data?.requests)
            // fetches information on all rides MATCHED to the driver (including ones that were canceled by rider)
            ? data.requests.filter(
                (request: {
                  status: "MATCHED" | "CANCELED";
                  canceledAt?: string | null;
                }) =>
                  // displays all MATCHED rides for the driver and CANCELED rides if duration since cancellation <=30m
                  request.status === "MATCHED" ||
                  (request.status === "CANCELED" && 
                    request.canceledAt &&
                    Date.now() - new Date(request.canceledAt).getTime() <=
                      CANCELED_CARD_VISIBILITY_MS)
              )
            : [];

          // Update the "Your Rides" list.
          setUpcomingRequests(recentDriverRides);
        }
      } catch {
        if (!ignore) {
          setUpcomingRequests([]);
        }
      }
    }

    // Only fetch when a valid driverId exists.
    if (driverId) {
      fetchUpcoming();
      interval = setInterval(fetchUpcoming, 30000);
    }

    return () => {
      ignore = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [driverId]);

  useEffect(() => {
    let ignore = false;
    let interval: NodeJS.Timeout | null = null;

    // Poll open ride requests so drivers see fresh requests.
    async function fetchOpenRequests() {
      try {
        const res = await fetch("/api/requests?status=OPEN");
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) {
          // Show only the top 3 open requests on this page.
          setOpenRequests((data.requests || []).slice(0, 3));
        }
      } catch {
        if (!ignore) {
          setOpenRequests([]);
        }
      }
    }

    // Initial load + periodic refresh every 10 seconds.
    fetchOpenRequests();
    interval = setInterval(fetchOpenRequests, 10000);

    return () => {
      ignore = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // Format a request's pickup time for display on cards.
  const formatPickupTime = (pickupAt: string) =>
    new Date(pickupAt).toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Accept a request and move it from "open" to "upcoming" for this driver.
  async function handleAccept(requestId: string) {
    setConfirmCard("");
    setAcceptingId(requestId);

    try {
      if (!driverId) {
        throw new Error("Unable to confirm driver. Please sign in again.");
      }
      // Server marks the request as matched to the driver.
      const res = await fetch("/api/requests/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to accept request.");
      }
      // Remove accepted request from the open list and show confirmation.
      setOpenRequests((prev) => prev.filter((req) => req.id !== requestId));
      setConfirmCard("Request accepted and moved to Upcoming Rides.");
    } catch (err: unknown) {
      setConfirmCard(getErrorMessage(err, "Failed to accept request."));
    } finally {
      setAcceptingId(null);
    }
  }

  /**
   * Toggle driver availability in the backend and sync local UI state.
   * Throws a readable error when the server rejects the update.
   */
  async function toggleAvailability(nextValue: boolean) {
    setAvailabilityError("");
    setIsAvailabilityUpdating(true);

    try {
      if (nextValue && licenseStatus === "expired") {
        setShowExpiredModal(true); // Intercept ON toggle and prompt for update.
        return;
      }
      const sessionToken = localStorage.getItem("sessionToken");
      // Authorization header mirrors the session fetch to identify the driver.
      const res = await fetch("/api/auth/driver/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ isAvailable: nextValue, verifyLicense: true }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to update availability.");
      }

      // Sync UI with persisted availability state.
      setIsAvailable(Boolean(body?.user?.isDriverAvailable));
    } catch (err: unknown) {
      setAvailabilityError(getErrorMessage(err, "Failed to update availability."));
    } finally {
      setIsAvailabilityUpdating(false);
    }
  }

  async function openStripePayoutOnboarding() {
    setConfirmCard("");
    try {
      const res = await fetch("/api/stripe/connect/onboarding-link", {
        method: "POST",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.url) {
        throw new Error(body?.error || "Unable to start Stripe onboarding.");
      }
      window.location.assign(body.url);
    } catch (error) {
      setConfirmCard(getErrorMessage(error, "Unable to start Stripe onboarding."));
    }
  }

  async function openStripeExpressDashboard() {
    setConfirmCard("");
    try {
      const res = await fetch("/api/stripe/connect/login-link", {
        method: "POST",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.url) {
        throw new Error(body?.error || "Unable to open Stripe Express dashboard.");
      }
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setConfirmCard(getErrorMessage(error, "Unable to open Stripe Express dashboard."));
    }
  }

  return (
    <main
      className="app-shell min-h-screen px-6 py-10 text-[var(--foreground)]"
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* Intro splash (brief confetti screen) before showing the dashboard. */}
        {showIntro ? (
          <div className="surface-card relative mx-auto mt-12 w-full max-w-xl overflow-hidden rounded-3xl px-8 py-10 text-center">
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
            <p className={`${displayFont.className} text-2xl text-[var(--primary)]`}>
              Thank you, {driverUserName || "Driver"}, for delivering safe rides to other students!
            </p>
            <p className="text-muted mt-3 text-sm">
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
        {/* Main dashboard layout once the intro has finished. */}
        <header className="app-topbar brand-accent-top flex flex-wrap items-start justify-between gap-6 rounded-[30px] px-5 py-5">
          <div>
            <BrandMark href="/dashboard" />
            <p className="eyebrow mt-6">Driver Dashboard</p>
            <h1 className={`${displayFont.className} mt-2 text-3xl text-[var(--primary)] sm:text-4xl`}>
              Drive with WintRides
            </h1>
            <p className="text-muted mt-1 text-sm">
              Manage availability, requests, payouts, and completed rides.
            </p>
          </div>
          <DashboardUtilityNav showHome homeHref="/dashboard" />
        </header>

        {/* Two-column layout: left = driver profile/availability, right = requests and earnings. */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-6">
            {/* Driver profile card with rating and review link. */}
            <div className="surface-card brand-accent-top rounded-3xl p-5 text-center">
              <div className="relative mx-auto h-32 w-32">
                <div className="surface-panel grid h-full w-full place-items-center rounded-full border-2 border-[var(--border-strong)]">
                  <span
                    className={`${displayFont.className} text-4xl text-[var(--primary)]`}
                    aria-label="Driver initials"
                  >
                    {driverInitials}
                  </span>
                </div>
                {isTopRated ? (
                  <span className="absolute -right-2 top-2 rounded-full bg-[var(--primary)] px-2 py-1 text-[10px] font-semibold text-white shadow-[var(--shadow-strong)]">
                    TOP RATED
                  </span>
                ) : null}
              </div>
              <h2 className={`${displayFont.className} mt-4 text-2xl text-[var(--primary)]`}>
                {driverName || "Driver"}
              </h2>
              {driverReviewsCount === 0 ? (
                <p className="mt-3 text-sm font-semibold text-[var(--primary)]">
                  (no rating yet)
                </p>
              ) : (
                <div className="mt-3 flex items-center justify-center gap-2 text-[#f0b429]">
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
                  <span className="text-sm font-semibold text-[var(--primary)]">
                    {driverRating.toFixed(1)}
                  </span>
                </div>
              )}
              <p className="text-muted mt-2 text-sm">
                Ratings & reviews{driverReviewsCount > 0 ? ` (${driverReviewsCount})` : ""}
              </p>
              <Link
                href={driverId ? `/drivers/${driverId}/reviews` : "/in-progress"}
                className="btn-secondary mt-4 px-5 py-2 text-sm font-semibold"
              >
                View all reviews
              </Link>
            </div>

            {/* Availability toggle card (client-side only for MVP). */}
            <div className="surface-card brand-accent-top rounded-3xl p-5">
              <div
                className="surface-panel flex items-center justify-between gap-3 rounded-full border-2 border-[var(--primary)] px-3 py-2"
              >
                <span className="text-sm font-semibold text-[var(--primary)]">Availability</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAvailability(false)}
                    disabled={isAvailabilityUpdating || isAvailable === false}
                    className={`rounded-full px-4 py-1 text-sm font-semibold transition disabled:opacity-60 ${
                      isAvailable
                        ? "btn-secondary"
                        : "btn-primary"
                    }`}
                  >
                    {isAvailabilityUpdating && isAvailable === false ? "Updating..." : "OFF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAvailability(true)}
                    disabled={isAvailabilityUpdating || isAvailable === true}
                    aria-disabled={licenseStatus === "expired"}
                    className={`rounded-full px-4 py-1 text-sm font-semibold transition disabled:opacity-60 ${
                      isAvailable
                        ? "btn-primary"
                        : "btn-secondary"
                    } ${licenseStatus === "expired" ? "cursor-not-allowed border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] shadow-none" : ""}`}
                  >
                    {isAvailabilityUpdating && isAvailable === true ? "Updating..." : "ON"}
                  </button>
                </div>
              </div>
              <p className="text-muted mt-3 text-sm">
                {isAvailable
                  ? "You are set to available. Expect pings for ride updates."
                  : "You are currently set to unavailable. Change status to receive request pings."}
              </p>
              {/* Inline chip reminder sits under the availability toggle. */}
              {(licenseStatus === "expiringSoon" || licenseStatus === "expired") ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,var(--background))] px-3 py-1 text-xs text-[var(--primary)]">
                  {/* Badge icon draws attention to the reminder. */}
                  <span
                    className="grid h-4 w-4 place-items-center rounded-full bg-[var(--primary)] text-[10px] font-semibold text-white badge-pulse"
                    aria-hidden="true"
                  >
                    !
                  </span>
                  <span>
                    {licenseStatus === "expired"
                      ? "License expired"
                      : `License expires in ${daysRemaining ?? "a few"} days`}
                  </span>
                  <Link href="/driver/enable?mode=update" className="font-semibold underline">
                    Update
                  </Link>
                  {/* Soft pulse on the badge to keep the reminder visible without being noisy. */}
                  <style jsx>{`
                    .badge-pulse {
                      animation: badgePulse 3.2s ease-in-out infinite;
                    }
                    @keyframes badgePulse {
                      0%,
                      100% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(4, 55, 242, 0.35);
                      }
                      50% {
                        transform: scale(1.06);
                        box-shadow: 0 0 0 8px rgba(4, 55, 242, 0);
                      }
                    }
                  `}</style>
                </div>
              ) : null}
              {availabilityError ? (
                <p className="mt-2 text-xs font-semibold text-[#b42318]">
                  {availabilityError}
                </p>
              ) : null}
            </div>
          </aside>

          <div className="space-y-6">
              {/* Earnings summary for the last week. */}
              <div className="flex flex-wrap items-center justify-between gap-4 px-1">
                <p className={`${displayFont.className} text-2xl text-[var(--primary)]`}>
                  You earned $320 in the past week
                </p>
              </div>

            {/* Collapsible list of new/open ride requests. */}
            <div className="surface-card brand-accent-top overflow-hidden rounded-3xl">
              <div className="flex items-center justify-between rounded-t-3xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white">
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
                <div className="surface-panel rounded-b-3xl px-5 py-4">
                  {/* Only show requests when the driver is available. */}
                  {isAvailable ? (
                    <div className="space-y-3">
                      {openRequests.map((ping) => (
                        <div
                          key={ping.id}
                          className="surface-panel flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                        >
                          <div className="text-sm">
                            <span className="font-semibold">Destination:</span> {ping.dropoffLabel}
                            <span className="mx-2 text-[var(--primary)]">•</span>
                            <span className="font-semibold">Pickup:</span> {ping.pickupLabel}
                            <span className="mx-2 text-[var(--primary)]">•</span>
                            <span className="font-semibold">Pick-up time:</span> {formatPickupTime(ping.pickupAt)}
                            <span className="mx-2 text-[var(--primary)]">•</span>
                            <span className="font-semibold">Pay:</span>{" "}
                            ${estimatePriceRange(ping.partySize).min}
                            {ping.paymentSummary ? (
                              <p className="text-muted mt-2 text-xs">
                                Payment: {ping.paymentSummary.label}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Accept triggers a POST to /api/requests/accept. */}
                            <button
                              type="button"
                              onClick={() => handleAccept(ping.id)}
                              disabled={acceptingId === ping.id}
                              className="btn-secondary px-4 py-1 text-xs font-semibold disabled:opacity-60"
                            >
                              {acceptingId === ping.id ? "Accepting..." : "Accept"}
                            </button>
                            <Link
                              href={`/driver/requests#request-${ping.id}`}
                              className="btn-secondary px-4 py-1 text-xs font-semibold"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      ))}
                      {openRequests.length === 0 ? (
                        <p className="app-feedback-panel app-feedback-muted app-feedback-center text-sm">
                          No open ride requests yet.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="app-feedback-panel app-feedback-muted app-feedback-center text-sm">
                      Turn ON availability to see ride requests.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {/* Upcoming rides summary with shortcuts to history/upcoming pages. */}
            <section className="surface-card brand-accent-top rounded-3xl p-6">
              <p className="eyebrow">History</p>
              <h3 className={`${displayFont.className} text-xl text-[var(--primary)]`}>
                Your Rides
              </h3>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link
                  href="/driver/ride-history"
                  className="btn-primary px-6 py-2 text-sm font-semibold"
                >
                  View Ride History
                </Link>
                <Link
                  href="/driver/upcoming"
                  className="btn-primary px-6 py-2 text-sm font-semibold"
                >
                  View Upcoming Rides
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {upcomingRequests.length === 0 ? (
                  <p className="app-feedback-panel app-feedback-muted text-sm">
                    No upcoming rides yet.
                  </p>
                ) : (
                  upcomingRequests.slice(0, 2).map((request) => (
                    <div
                      key={request.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                        request.status === "CANCELED"
                          ? "driver-canceled-card border-[var(--border-strong)] bg-[var(--surface)]"
                          : "border-[var(--primary)] bg-[var(--surface)]"
                      }`}
                    >
                      <div className="text-sm">
                        <span className="font-semibold">{request.dropoffLabel}</span>
                        <span className="mx-2 text-[var(--primary)]">•</span>
                        <span>{formatPickupTime(request.pickupAt)}</span>
                        <span className="mx-2 text-[var(--primary)]">•</span>
                        <span className="font-semibold">Pickup:</span> {request.pickupLabel}
                        {request.paymentSummary ? (
                          <p className="text-muted mt-2 text-xs">
                            Payment: {request.paymentSummary.label}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          request.status === "CANCELED"
                            ? "surface-panel text-muted"
                            : "bg-[color-mix(in_srgb,var(--primary)_12%,var(--background))] text-[var(--primary)]"
                        }`}
                      >
                        {request.status === "CANCELED" ? "CANCELED" : "UPCOMING"}
                      </span>
                      <Link
                        href="/driver/upcoming"
                        className="btn-secondary px-3 py-1 text-xs font-semibold"
                      >
                        View
                      </Link>
                    </div>
                  ))
                )}
              </div>
              <style jsx>{`
                .driver-canceled-card {
                  animation: driver-cancel-vibrate 0.95s ease-in-out infinite;
                }

                @keyframes driver-cancel-vibrate {
                  0%,
                  100% {
                    transform: scale(1);
                  }
                  50% {
                    transform: scale(1.02);
                  }
                }

                @media (prefers-reduced-motion: reduce) {
                  .driver-canceled-card {
                    animation: none;
                  }
                }
              `}</style>
            </section>


            {/* Payout section routes drivers to the Stripe-backed onboarding hub. */}
            <section className="surface-card brand-accent-top overflow-hidden rounded-3xl">
              <button
                type="button"
                onClick={() => setPaymentOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-t-3xl bg-[var(--primary)] px-5 py-3 text-left text-sm font-semibold text-white"
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
                <div className="surface-panel px-5 py-4">
                  <div className="space-y-3 text-sm">
                    <p className="text-muted">
                      {stripePayoutReady
                        ? "Your Stripe payout setup is active. You can manage your Express account here or from Account > Payments."
                        : stripeOnboardingComplete
                          ? "Stripe onboarding is submitted, but payouts are not active yet. Review your Express account or finish any requested steps."
                          : "Complete Stripe onboarding before accepting rides so WintRides can send payouts after completed trips."}
                    </p>
                    <button
                      type="button"
                      onClick={openStripePayoutOnboarding}
                      className="btn-secondary px-4 py-2 text-sm font-semibold"
                    >
                      {stripeOnboardingComplete ? "Review payout setup" : "Start payout setup"}
                    </button>
                    <button
                      type="button"
                      onClick={openStripeExpressDashboard}
                      className="btn-secondary px-4 py-2 text-sm font-semibold"
                    >
                      Open Stripe Express dashboard
                    </button>
                    <Link
                      href="/account/payments"
                      className="btn-secondary px-4 py-2 text-sm font-semibold"
                    >
                      Open Account payments
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </section>
        </>
        )}
      </div>
      {/* Toast-style confirmation after accepting a request. */}
      {confirmCard ? (
        <div className="surface-card fixed bottom-6 right-6 z-50 max-w-xs rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <PaymentsSupportMessage message={confirmCard} className="text-sm" />
            <button
              type="button"
              onClick={() => setConfirmCard("")}
              className="btn-secondary px-2 py-0.5 text-xs font-semibold"
              aria-label="Dismiss confirmation"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
      {showExpiredModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="surface-card w-full max-w-md rounded-3xl p-6">
            <h3 className={`${displayFont.className} text-xl text-[var(--primary)]`}>
              License expired
            </h3>
            <p className="text-muted mt-2 text-sm">
              Update your license details to continue accepting rides.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/driver/enable?mode=update"
                className="btn-primary px-5 py-2 text-sm font-semibold"
              >
                Update details
              </Link>
              <button
                type="button"
                onClick={() => setShowExpiredModal(false)}
                className="btn-secondary px-5 py-2 text-sm font-semibold"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
