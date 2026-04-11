/**
 * Dashboard Page
 * 
 * Main app page shown after user signs up or signs in.
 * Contains navigation to request rides, carpool flows, and driver's dashboard (or form to become a driver)
 * 
 * AUTHENTICATION PROTECTION:
 * - This page requires user to be authenticated (signed in)
 * - On page load, checks if user has valid session
 * - If not authenticated: redirects to sign in page
 * - If authenticated: shows dashboard with Request and Carpool buttons
 * - Shows a recent "Your Rides" card after a request is placed (MVP uses localStorage)
 * 
 * MVP:
 *   - Client-side session check on page load
 *   - Basic redirect if not authenticated
 * 
 * Production (To do):
 *   - Use Next.js middleware for route protection (more secure)
 *   - Server-side session validation
 *   - Add loading states during authentication check
 *   - Cache session check to avoid repeated API calls
 */

"use client";

// Dashboard is a client component because it checks auth state on the client (browser)
// This means it shows the page before it checks if the user is logged in for that session
// and uses local UI state (alerts, menus).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RequestButton from "@/components/requestbutton";
import Link from "next/link";
import { Playfair_Display, Work_Sans } from "next/font/google";

// set up the display and body font for consistency through the page
const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const REVIEW_WINDOW_DAYS = 7;
const REVIEW_PROMPT_DISMISSALS_KEY = "dismissedReviewPromptRideIds";

type StoredReview = {
  id: string;
  driverId: string;
  rideRequestId?: string;
  rating: number;
  text: string;
  createdAt: string;
};

type CompletedRideReviewCandidate = {
  id: string;
  status: "COMPLETED";
  acceptedDriverId?: string | null;
  dropoffLabel: string;
  completedAt?: string | null;
};

// MVP review persistence helper (localStorage-backed).
function loadReviews(): StoredReview[] {
  try {
    const stored = localStorage.getItem("driverReviews");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as StoredReview[]) : [];
  } catch {
    return [];
  }
}

function getDriverReviewStats(driverId: string) {
  // Calculate review stats for a driver confirmation card.
  const reviews = loadReviews().filter((review) => review.driverId === driverId);
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    average: total / reviews.length,
    count: reviews.length,
  };
}

function isReviewWindowOpen(completedAt?: string | null): boolean {
  if (!completedAt) return false;
  const completedAtMs = new Date(completedAt).getTime();
  if (!Number.isFinite(completedAtMs)) return false;
  const deadlineMs = completedAtMs + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() <= deadlineMs;
}

function loadDismissedReviewPromptRideIds(): string[] {
  try {
    const stored = localStorage.getItem(REVIEW_PROMPT_DISMISSALS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function saveDismissedReviewPromptRideIds(rideIds: string[]) {
  localStorage.setItem(REVIEW_PROMPT_DISMISSALS_KEY, JSON.stringify(rideIds));
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// Build fetch-compatible auth headers only when a token exists.
// Returning `undefined` instead of `{ Authorization: undefined }` avoids
// the TypeScript error shown in the editor because `HeadersInit` requires
// header values to always be strings.
function buildAuthHeaders(sessionToken: string | null): HeadersInit | undefined {
  return sessionToken
    ? {
        Authorization: `Bearer ${sessionToken}`,
      }
    : undefined;
}

export default function DashboardPage() {
  const router = useRouter();

  // Alerts pulled from the notifications API and rendered in the Alerts panel.
  const [alerts, setAlerts] = useState<
    { id: string; tone: string; text: string }[]
  >([]);

  // State to track authentication check:
  // null = checking, true = authenticated, false = not authenticated.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // Whether the signed-in user has driver privileges.
  const [isDriver, setIsDriver] = useState<boolean | null>(null);
  // Username displayed in the welcome header.
  const [userName, setUserName] = useState<string>("");
  // Controls the "Loading..." UI while auth is being verified.
  const [isLoading, setIsLoading] = useState(true);
  // Controls whether the alert list is expanded.
  const [alertsOpen, setAlertsOpen] = useState(true);
  // Rider's upcoming rides shown in the Ride Status section of the dashboard (OPEN/MATCHED rides only).
  const [riderId, setRiderId] = useState<string>("");
  const [upcomingRides, setUpcomingRides] = useState<
    {
      id: string;
      status: "OPEN" | "MATCHED";
      acceptedDriverId?: string | null;
      pickupLabel: string;
      dropoffLabel: string;
      pickupAt: string;
      partySize: number;
      carsNeeded: number;
      authorizationScheduledFor?: string | null;
      paymentSummary?: {
        tone: "neutral" | "info" | "success" | "danger";
        label: string;
        detail: string;
      };
    }[]
  >([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [ridesError, setRidesError] = useState("");
  const [cancelingRideId, setCancelingRideId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelModalRide, setCancelModalRide] = useState<{
    id: string;
    status: "OPEN" | "MATCHED";
  } | null>(null);
  const [completedReviewCandidates, setCompletedReviewCandidates] = useState<
    CompletedRideReviewCandidate[]
  >([]);
  const [reviewedRideIds, setReviewedRideIds] = useState<Set<string>>(new Set());
  const [dismissedReviewPromptRideIds, setDismissedReviewPromptRideIds] =
    useState<Set<string>>(new Set());
  const [driverProfiles, setDriverProfiles] = useState<
    Record<string, { id: string; name: string; rating: number; reviewsCount: number }>
  >({});
  // Controls the modal that tells drivers they already have access.
  const [showDriverModal, setShowDriverModal] = useState(false);
  // Tracks the delayed redirect so it can be canceled on unmount.
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Check if user is authenticated
   * 
   * FLOW:
   * 1. Call session API endpoint to check if user has valid session
   * 2. Session API checks cookie/header for session token
   * 3. If valid session exists: user is authenticated
   * 4. If no session or invalid: user is not authenticated
   * 
   * MVP: Client-side check on page load
   * Production: Use server-side middleware for better security
   */
  // Load the signed-in rider ID to scope upcoming ride queries.
  useEffect(() => {
    async function checkAuthentication() {
      try {
        // MVP: token in localStorage; production should use httpOnly cookies.
        const sessionToken = localStorage.getItem("sessionToken");
        const authHeaders = buildAuthHeaders(sessionToken);

        // Session API validates either the Authorization header or cookies.
        const res = await fetch("/api/auth/session", {
          method: "GET",
          // If no token exists we omit the header entirely.
          headers: authHeaders,
        });

        if (res.ok) {
          // Valid session: allow dashboard render and capture driver role.
          const data = await res.json().catch(() => null);
          setIsAuthenticated(true);
          setIsDriver(Boolean(data?.user?.isDriver));
          setUserName(data?.user?.userName || "");
          setRiderId(data?.user?.id || "");
        } else {
          // Invalid session: clear token and redirect to sign-in.
          setIsAuthenticated(false);
          setIsDriver(null);
          
          localStorage.removeItem("sessionToken");
          
          router.push("/signin");
        }
      } catch (error) {
        // Any error => treat as not authenticated for MVP safety.
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
        setIsDriver(null);
        localStorage.removeItem("sessionToken");
        router.push("/signin");
      } finally {
        // Always end the loading state after the check finishes.
        setIsLoading(false);
      }
    }

  // Kick off auth check on mount.
  checkAuthentication();
  }, [router]);

  // Fetch upcoming rides for the Ride Status banner.
  useEffect(() => {
    let ignore = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    // Fetch notifications for the signed-in user and map them to alert UI data.
    async function fetchAlerts() {
      try {
        const sessionToken = localStorage.getItem("sessionToken");
        const authHeaders = buildAuthHeaders(sessionToken);
        // MVP: pass the session token via Authorization header.
        const res = await fetch("/api/notifications", {
          method: "GET",
          headers: authHeaders,
        });

        // If the request fails, keep the last known alerts.
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        // Defensive guard: only accept arrays from the API response.
        const items = Array.isArray(data?.notifications) ? data.notifications : [];

        if (!ignore) {
          // Map backend notifications into the alert list shown on the dashboard.
          setAlerts(
            items.map((item: { id: string; type?: string; message?: string }) => ({
              id: item.id,
              tone: item.type === "RIDE_ACCEPTED" ? "bg-amber-400" : "bg-red-500",
              text: item.message || "New notification",
            }))
          );
        }
      } catch {
        if (!ignore) {
          // If the API fails, clear alerts so we don't show stale items.
          setAlerts([]);
        }
      }
    }

    // Start polling after auth succeeds so we only request user-specific data.
    if (isAuthenticated) {
      fetchAlerts();
      interval = setInterval(fetchAlerts, 15000);
    }

    return () => {
      ignore = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // Track which prompt rides have already been dismissed on this device.
  useEffect(() => {
    setDismissedReviewPromptRideIds(
      new Set(loadDismissedReviewPromptRideIds())
    );
  }, []);

  useEffect(() => {
    let ignore = false;
    // Fetches all OPEN & MATCHED rides for the rider
    async function fetchUpcomingRides() {
      setRidesError("");
      setRidesLoading(true);
      try {
        if (!riderId) return;
        const sessionToken = localStorage.getItem("sessionToken");
        const authHeaders = buildAuthHeaders(sessionToken);
        const res = await fetch(
          `/api/requests?status=OPEN,MATCHED&participantId=${riderId}`,
          {
            headers: authHeaders,
          }
        );
        if (!res.ok) {
          throw new Error("Failed to load ride status.");
        }
        const data = await res.json();
        if (!ignore) {
          setUpcomingRides(data.requests || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setRidesError(getErrorMessage(err, "Failed to load ride status."));
        }
      } finally {
        if (!ignore) {
          setRidesLoading(false);
        }
      }
    }

    if (riderId) {
      fetchUpcomingRides();
    }

    return () => {
      ignore = true;
    };
  }, [riderId]);

  useEffect(() => {
    let ignore = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    // Poll for completed rides plus already-written reviews so the dashboard can
    // prompt for the newest eligible ride without requiring a refresh.
    async function fetchReviewPromptData() {
      try {
        // Until auth has resolved, there is no rider-scoped data to fetch.
        if (!riderId) return;
        const sessionToken = localStorage.getItem("sessionToken");
        const authHeaders = buildAuthHeaders(sessionToken);

        // We need both pieces of information:
        // 1. completed rides the rider could potentially review
        // 2. reviews already submitted, so we do not prompt again
        const [completedRes, reviewsRes] = await Promise.all([
          fetch(`/api/requests?status=COMPLETED&participantId=${riderId}`, {
            headers: authHeaders,
          }),
          fetch(`/api/reviews?riderId=${riderId}`, {
            headers: authHeaders,
          }),
        ]);

        // If either request fails, keep the previous prompt state instead of
        // clearing it and flashing the UI.
        if (!completedRes.ok || !reviewsRes.ok) return;

        const [completedData, reviewsData] = await Promise.all([
          completedRes.json().catch(() => null),
          reviewsRes.json().catch(() => null),
        ]);

        if (ignore) return;

        // Keep the raw completed rides so we can choose the newest eligible one
        // later during render.
        setCompletedReviewCandidates(
          Array.isArray(completedData?.requests)
            ? completedData.requests
            : []
        );
        // Convert the API response into a Set for O(1) "has this ride been reviewed?"
        // lookups when deciding whether to show the prompt.
        setReviewedRideIds(
          new Set<string>(
            Array.isArray(reviewsData?.reviews)
              ? reviewsData.reviews.map(
                  (review: { rideRequestId: string }) => review.rideRequestId
                )
              : []
          )
        );
      } catch {
        if (!ignore) {
          setCompletedReviewCandidates([]);
          setReviewedRideIds(new Set());
        }
      }
    }

    if (riderId) {
      fetchReviewPromptData();
      interval = setInterval(fetchReviewPromptData, 30000);
    }

    return () => {
      ignore = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [riderId]);

  // Load driver details for matched rides (name + rating + reviews count).
  useEffect(() => {
    let ignore = false;

    async function fetchDriverProfiles(driverIds: string[]) {
      if (driverIds.length === 0) return;
      const sessionToken = localStorage.getItem("sessionToken");
      const authHeaders = buildAuthHeaders(sessionToken);

      // Fetch minimal driver profiles for confirmation cards.
      const entries = await Promise.all(
        driverIds.map(async (id) => {
          try {
            const res = await fetch(`/api/users/${id}`, {
              headers: authHeaders,
            });
            if (!res.ok) return null;
            const data = await res.json().catch(() => null);
            if (!data?.user) return null;
            return [
              id,
              {
                id,
                name: data.user.name,
                rating: data.user.rating,
                reviewsCount: data.user.reviewsCount,
              },
            ] as const;
          } catch {
            return null;
          }
        })
      );

      // Skip state updates if the effect has been cleaned up.
      if (ignore) return;
      const next = entries.filter(Boolean) as Array<
        readonly [string, { id: string; name: string; rating: number; reviewsCount: number }]
      >;
      // No new profiles fetched, so nothing to merge.
      if (next.length === 0) return;
      // Merge fetched driver profiles into the existing cache.
      setDriverProfiles((prev) => {
        const updated = { ...prev };
        next.forEach(([id, profile]) => {
          updated[id] = profile;
        });
        return updated;
      });
    }

    // Build a list of matched drivers that we haven't fetched yet.
    const missingDriverIds = upcomingRides
      .filter((ride) => ride.status === "MATCHED" && ride.acceptedDriverId)
      .map((ride) => ride.acceptedDriverId as string)
      .filter((id) => !driverProfiles[id]);

    // Only fetch driver details we don't already have cached.
    if (missingDriverIds.length > 0) {
      fetchDriverProfiles(Array.from(new Set(missingDriverIds)));
    }

    return () => {
      ignore = true;
    };
  }, [upcomingRides, driverProfiles]);

  // Open the rider cancellation modal from the confirmation card.
  function handleCancelRideClick(ride: {
    id: string;
    status: "OPEN" | "MATCHED";
  }) {
    setCancelError("");
    setCancelModalRide(ride);
  }

  // Confirm cancellation from the inline modal and remove from Upcoming.
  async function handleCancelRideConfirm() {
    if (!cancelModalRide) return;

    setCancelingRideId(cancelModalRide.id);
    try {
      // Call the API route that updates the ride status to CANCEL in the database.
      const sessionToken = localStorage.getItem("sessionToken");
      const authHeaders = buildAuthHeaders(sessionToken);
      const res = await fetch("/api/requests/rider-cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ requestId: cancelModalRide.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to cancel ride.");
      }
      // updates the Upcoming Rides list to exclude the canceled ride
      setUpcomingRides((prev) =>
        prev.filter((item) => item.id !== cancelModalRide.id)
      );
      setCancelModalRide(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel ride.";
      setCancelError(message);
    } finally {
      setCancelingRideId(null);
    }
  }

  // Loading state while auth check runs.
  if (isLoading) {
    return (
      <main
        className={`min-h-screen bg-[#f4ecdf] bg-[radial-gradient(circle_at_top,_#f9f2e8,_#f4ecdf_60%)] ${bodyFont.className}`}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-[#6b5f52]">Loading...</p>
        </div>
      </main>
    );
  }

  // If unauthenticated, do not render anything (redirect in progress).
  if (!isAuthenticated) {
    return null; // Avoid flashing the dashboard before redirect.
  }

  // Route drivers straight to their dashboard; others go to enable flow.
  const handleDriverDashboardClick = () => {
    if (isDriver) {
      router.push("/driver/dashboard");
      return;
    }

    router.push("/driver/enable");
  };

  // Show a brief modal for existing drivers, then redirect them.
  const handleBecomeDriverClick = () => {
    if (!isDriver) {
      router.push("/driver/enable");
      return;
    }

    setShowDriverModal(true);
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }
    redirectTimeoutRef.current = setTimeout(() => {
      router.push("/driver/dashboard");
    }, 3000);
  };

  const reviewPromptRide =
    completedReviewCandidates
      .filter(
        (ride) =>
          // Only rides with a matched driver can be reviewed.
          Boolean(ride.acceptedDriverId) &&
          // Only rides still inside the 7-day review window should prompt.
          isReviewWindowOpen(ride.completedAt) &&
          // Skip rides already reviewed.
          !reviewedRideIds.has(ride.id) &&
          // Skip rides the rider already dismissed on this device.
          !dismissedReviewPromptRideIds.has(ride.id)
      )
      // If multiple rides are eligible, prompt for the most recent one only.
      .sort((left, right) => {
        const leftCompletedAt = new Date(left.completedAt ?? 0).getTime();
        const rightCompletedAt = new Date(right.completedAt ?? 0).getTime();
        return rightCompletedAt - leftCompletedAt;
      })[0] ?? null;

  // "Maybe later" stores the ride ID in localStorage so this prompt does not
  // keep reappearing for the same ride on this browser.
  function dismissReviewPrompt(rideId: string) {
    setDismissedReviewPromptRideIds((prev) => {
      const next = new Set(prev);
      next.add(rideId);
      saveDismissedReviewPromptRideIds(Array.from(next));
      return next;
    });
  }

  // Deep-link into Ride History so the rider lands on the specific review form
  // instead of having to manually find the completed ride.
  function handleLeaveReviewClick(rideId: string) {
    dismissReviewPrompt(rideId);
    router.push(`/dashboard/ride-history?reviewRideId=${rideId}#review-${rideId}`);
  }

  return (
    <main
      className={`min-h-screen bg-[#f4ecdf] bg-[radial-gradient(circle_at_top,_#f9f2e8,_#f4ecdf_60%)] ${bodyFont.className}`}
    >
      {reviewPromptRide && !cancelModalRide && !showDriverModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-xl rounded-3xl border-2 border-[#0a3570] bg-[#fdf7ef] p-6 shadow-[0_18px_40px_rgba(10,27,63,0.2)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b5f52]">
              Completed ride
            </p>
            <h2 className={`${displayFont.className} mt-2 text-2xl text-[#0a3570]`}>
              Leave a review for your driver
            </h2>
            <p className="mt-3 text-sm text-[#6b5f52]">
              Your ride to {reviewPromptRide.dropoffLabel} has been completed.
              You can leave a review now, or return to Ride History within 7 days.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => dismissReviewPrompt(reviewPromptRide.id)}
                className="rounded-full border border-[#0a3570] bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a3570] hover:bg-[#efe3d2]"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={() => handleLeaveReviewClick(reviewPromptRide.id)}
                className="rounded-full border border-[#0a3570] bg-[#0a3570] px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-[#092a59]"
              >
                Leave a review
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {cancelModalRide ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-xl rounded-3xl border-2 border-[#0a3570] bg-[#fdf7ef] p-6 shadow-[0_18px_40px_rgba(10,27,63,0.2)]">
            <h2 className={`${displayFont.className} text-2xl text-[#0a3570]`}>
              Are you sure you want to cancel?
            </h2>
            {cancelModalRide.status === "MATCHED" ? (
              <p className="mt-3 text-sm text-[#6b5f52]">
                You&apos;ll be charged 10% of the transaction.
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalRide(null)}
                className="rounded-full border border-[#0a3570] bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a3570] hover:bg-[#efe3d2]"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelRideConfirm}
                disabled={cancelingRideId === cancelModalRide.id}
                className="rounded-full border border-[#b35656] bg-[#b35656] px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-[#a54c4c] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cancelingRideId === cancelModalRide.id
                  ? "Canceling..."
                  : "Cancel Ride"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="relative w-full max-w-xl rounded-2xl border-2 border-[#0a3570] bg-[#f8efe3] p-8 text-center shadow-[0_20px_50px_rgba(10,27,63,0.35)]">
            <p className="text-lg font-semibold text-[#0a1b3f]">
              Oops, you are already a driver. Taking you to your dashboard!
            </p>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 text-[#0a1b3f]">
        {/* Header with greeting + MVP utility icons */}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1
              className={`${displayFont.className} text-3xl sm:text-4xl`}
            >
              Welcome, {userName || "there"}👋🏽
            </h1>
            <p className="mt-1 text-sm text-[#6b5f52]">
              Ready for your next ride?
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Account icon links to the account profile hub */}
            <Link
              href="/account/profile"
              aria-label="Account"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c2.2-4 13.8-4 16 0" />
              </svg>
            </Link>
            <Link
              href="/in-progress"
              aria-label="Settings"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.5.9Z" />
              </svg>
            </Link>
            <Link
              href="/help"
              aria-label="Help"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" />
                <circle cx="12" cy="17" r="1" />
              </svg>
            </Link>
            <Link
              href="/in-progress"
              aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 8a6 6 0 1 0-12 0c0 7-2 7-2 7h16s-2 0-2-7" />
                <path d="M9 18a3 3 0 0 0 6 0" />
              </svg>
              <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-semibold text-white">
                5
              </span>
            </Link>
          </div>
        </header>

        {/* Alerts panel with collapse toggle */}
        <section className="relative mt-8 rounded-2xl border-2 border-[#0a3570] bg-[#f4ecdf] p-6">
          <button
            type="button"
            onClick={() => setAlertsOpen((prev) => !prev)}
            className="absolute -top-4 left-4 flex items-center gap-2 rounded-t-lg bg-[#0a3570] px-4 py-2 text-sm font-semibold text-white"
            aria-expanded={alertsOpen}
          >
            Alerts
            <span
              className={`text-xs transition-transform ${
                alertsOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>
          {alertsOpen ? (
            <ul className="mt-2 space-y-4">
              {alerts.length === 0 ? (
                <li className="text-sm text-[#6b5f52]">No alerts yet.</li>
              ) : null}
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <span
                      className={`h-3 w-3 rounded-sm ${alert.tone}`}
                      aria-hidden="true"
                    />
                    <span>{alert.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-4 py-1 text-xs font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-4 py-1 text-xs font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* Ride Status banner with upcoming rides and cancel actions. */}
        <section className="mt-6">
          <div className="rounded-2xl border-2 border-[#0a3570] bg-[#fdf7ef] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#0a3570]">
                  Ride Status
                </h2>
                <p className="mt-2 text-sm text-[#6b5f52]">
                  Shows upcoming rides and active requests.
                </p>
              </div>
              <span className="rounded-full border border-[#0a3570] bg-[#f6efe6] px-4 py-2 text-xs font-semibold text-[#0a3570]">
                {upcomingRides.length} upcoming
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {ridesLoading && (
                <div className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-6 text-center text-sm text-[#6b5f52]">
                  Loading ride status...
                </div>
              )}

              {!ridesLoading && ridesError && (
                <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-6 text-center">
                  <p className="text-sm text-red-600">{ridesError}</p>
                </div>
              )}

              {!ridesLoading && !ridesError && upcomingRides.length === 0 && (
                <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-6 text-center text-sm text-[#6b5f52]">
                  No upcoming rides yet.
                </div>
              )}

              {!ridesLoading && !ridesError && cancelError && (
                <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-4 text-center">
                  <p className="text-sm text-red-600">{cancelError}</p>
                </div>
              )}

              {!ridesLoading && !ridesError && upcomingRides.length > 0 && (
                <div className="space-y-4">
              {upcomingRides.map((ride) => (
                <div
                  key={ride.id}
                  className="rounded-2xl border-2 border-[#0a3570] bg-[#fdf7ef] p-5"
                >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-[#0a3570]">
                            {ride.dropoffLabel}
                          </h3>
                          <p className="mt-1 text-sm text-[#6b5f52]">
                            {new Date(ride.pickupAt).toLocaleString([], {
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            ride.status === "MATCHED"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {ride.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#6b5f52]">
                        Pickup: {ride.pickupLabel}
                      </p>
                  <p className="mt-1 text-sm text-[#6b5f52]">
                    Party size: {ride.partySize} • Cars needed: {ride.carsNeeded}
                  </p>
                  {ride.paymentSummary ? (
                    <div
                      className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                        ride.paymentSummary.tone === "danger"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : ride.paymentSummary.tone === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                      }`}
                    >
                      <p className="font-semibold">{ride.paymentSummary.label}</p>
                      <p className="mt-1">{ride.paymentSummary.detail}</p>
                      {ride.authorizationScheduledFor ? (
                        <p className="mt-1 text-xs">
                          Authorization window opens {new Date(ride.authorizationScheduledFor).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {/* Driver confirmation card only appears once a driver is matched. */}
                  {ride.status === "MATCHED" && ride.acceptedDriverId ? (
                    <div className="mt-4 rounded-2xl border border-[#0a3570] bg-white/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">
                        Driver confirmation
                      </p>
                      {(() => {
                        const stats = getDriverReviewStats(ride.acceptedDriverId as string);
                        const rating =
                          stats?.average ??
                          driverProfiles[ride.acceptedDriverId]?.rating ??
                          5.0;
                        const reviewsCount =
                          stats?.count ??
                          driverProfiles[ride.acceptedDriverId]?.reviewsCount ??
                          0;
                        return (
                          <>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#0a3570]">
                            {driverProfiles[ride.acceptedDriverId]?.name || "Driver"}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-sm text-[#6b5f52]">
                            <div className="flex items-center gap-1 text-[#f0b429]">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <svg
                                  key={`driver-star-${ride.id}-${index}`}
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="currentColor"
                                >
                                  <path d="M12 17.3l-6.2 3.7 1.7-7-5.5-4.8 7.2-.6L12 2l2.8 6.6 7.2.6-5.5 4.8 1.7 7z" />
                                </svg>
                              ))}
                            </div>
                            <span>
                              {rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-[#6b5f52]">
                          <p>
                            {reviewsCount} reviews
                          </p>
                          <Link
                            href={`/drivers/${ride.acceptedDriverId}/reviews`}
                            className="mt-2 inline-flex rounded-full border border-[#0a3570] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a3570] hover:bg-[#e9dcc9]"
                          >
                            View reviews
                          </Link>
                        </div>
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => handleCancelRideClick(ride)}
                          disabled={cancelingRideId === ride.id}
                          className="rounded-full border border-[#b35656] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b35656] transition hover:bg-[#f7e9e7] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {cancelingRideId === ride.id ? "Canceling..." : "Cancel ride"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Ride History entry point (separate page). */}
        <section className="mt-6 rounded-2xl border-2 border-[#0a3570] bg-[#fdf7ef] p-5">
          <h2 className="text-lg font-semibold text-[#0a3570]">Ride History</h2>
          <p className="mt-2 text-sm text-[#6b5f52]">
            Review completed and canceled rides.
          </p>
          <Link
            href="/dashboard/ride-history"
            className="mt-4 inline-flex items-center rounded-full border border-[#0a3570] bg-[#e9dcc9] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a1b3f] hover:bg-[#dbc8ad]"
          >
            View history
          </Link>
        </section>

        {/* Primary prompt */}
        <h2
          className={`${displayFont.className} mt-10 text-center text-3xl sm:text-4xl`}
        >
          What would you like to do today?
        </h2>

        <div className="mt-10 grid gap-10">
          {/* Request a ride row */}
          <div className="grid gap-6 md:grid-cols-[220px_auto] md:items-center">
            <RequestButton
              label="Request a Ride"
              unstyled
              className="w-full rounded-none bg-[#0a3570] px-5 py-3 text-base font-semibold text-white shadow-[0_8px_20px_rgba(10,27,63,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0a2d5c] hover:shadow-[0_14px_28px_rgba(10,27,63,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a3570] focus-visible:ring-offset-2"
            />
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1 rounded-2xl border-2 border-[#0a3570] bg-[#f8efe3] p-5">
                <p className="text-lg font-semibold">
                  Wanna split a ride with a friend?
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {/* Carpool creation flow */}
                  <Link
                    href="/carpool/create"
                    className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-5 py-2 text-sm font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                  >
                    Create Carpool Request
                  </Link>
                  {/* Carpool discovery flow */}
                  <Link
                    href="/carpool/feed"
                    className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-5 py-2 text-sm font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                  >
                    Join Available Carpool
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Offer a ride row */}
          <div className="grid gap-6 md:grid-cols-[220px_auto] md:items-center">
            <button
              type="button"
              onClick={handleDriverDashboardClick}
              className="w-full rounded-none bg-[#0a3570] px-5 py-3 text-center text-base font-semibold text-white shadow-[0_8px_20px_rgba(10,27,63,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0a2d5c] hover:shadow-[0_14px_28px_rgba(10,27,63,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a3570] focus-visible:ring-offset-2"
            >
              Offer a Ride
            </button>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1 rounded-2xl border-2 border-[#0a3570] bg-[#f8efe3] p-5">
                <p className="text-lg font-semibold">
                  Have extra seats? Offer a ride today!
                </p>
                <p className="text-xs text-[#6b5f52]">
                  Help others and earn. Verified .edu email required!
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {/* Driver tools placeholder */}
                  <button
                    type="button"
                    onClick={handleDriverDashboardClick}
                    className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-5 py-2 text-sm font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                  >
                    Take me to driver dashboard
                  </button>
                  {/* Driver onboarding placeholder */}
                  <button
                    type="button"
                    onClick={handleBecomeDriverClick}
                    className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-5 py-2 text-sm font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                  >
                    Become a driver
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
