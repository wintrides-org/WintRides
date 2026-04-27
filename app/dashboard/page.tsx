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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import RequestButton from "@/components/requestbutton";
import SignOutButton from "@/components/SignOutButton";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import DashboardUtilityNav from "@/components/DashboardUtilityNav";
import type { CarpoolType } from "@/types/carpool";

const displayFont = { className: "font-heading" };

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showCarpoolModal = searchParams.get("carpoolOptions") === "1";

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
        className="app-shell min-h-screen"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="app-feedback-panel app-feedback-muted text-sm">Loading...</p>
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

  // Mirror the carpool chooser state into the dashboard URL so carpool pages
  // can send riders back to the chooser without adding a separate route.
  function setCarpoolModalState(nextOpen: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextOpen) {
      params.set("carpoolOptions", "1");
    } else {
      params.delete("carpoolOptions");
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  // Carry the chosen role into the create page so the form can start in the
  // correct mode instead of asking again.
  function handleCarpoolTypeSelect(carpoolType: CarpoolType) {
    router.push(`/carpool/create?carpoolType=${carpoolType}`);
  }

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
      className="app-shell min-h-screen"
    >
      {reviewPromptRide && !cancelModalRide && !showDriverModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-6">
          <div className="surface-card w-full max-w-xl rounded-3xl p-6">
            <p className="text-muted text-xs font-semibold uppercase tracking-[0.22em]">
              Completed ride
            </p>
            <h2 className={`${displayFont.className} mt-2 text-2xl text-[var(--primary)]`}>
              Leave a review for your driver
            </h2>
            <p className="text-muted mt-3 text-sm">
              Your ride to {reviewPromptRide.dropoffLabel} has been completed.
              You can leave a review now, or return to Ride History within 7 days.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => dismissReviewPrompt(reviewPromptRide.id)}
                className="btn-secondary px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={() => handleLeaveReviewClick(reviewPromptRide.id)}
                className="btn-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
              >
                Leave a review
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {cancelModalRide ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="surface-card w-full max-w-xl rounded-3xl p-6">
            <h2 className={`${displayFont.className} text-2xl text-[var(--primary)]`}>
              Are you sure you want to cancel?
            </h2>
            {cancelModalRide.status === "MATCHED" ? (
              <p className="text-muted mt-3 text-sm">
                You&apos;ll be charged 10% of the transaction.
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalRide(null)}
                className="btn-secondary px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelRideConfirm}
                disabled={cancelingRideId === cancelModalRide.id}
                className="btn-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-70"
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
          <div className="surface-card relative w-full max-w-xl rounded-2xl p-8 text-center">
            <p className="text-lg font-semibold text-[var(--foreground)]">
              Oops, you are already a driver. Taking you to your dashboard!
            </p>
          </div>
        </div>
      )}
      {showCarpoolModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="surface-card w-full max-w-xl rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4">
              <button
                type="button"
                onClick={() => setCarpoolModalState(false)}
                className="btn-secondary grid h-12 w-12 place-items-center rounded-full p-0"
                aria-label="Back to dashboard"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setCarpoolModalState(false)}
                className="btn-ghost rounded-lg px-2 py-1 text-sm text-muted"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <h2 className={`${displayFont.className} mt-4 text-2xl text-[var(--primary)]`}>
              Who are you requesting this carpool as?
            </h2>
            <p className="text-muted mt-2 text-sm">
              Choose whether you are offering seats as the driver or coordinating as a rider.
            </p>
            <div className="mt-6 grid gap-3">
              {isDriver ? (
                <button
                  type="button"
                  onClick={() => handleCarpoolTypeSelect("DRIVER")}
                  className="group surface-panel rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:bg-[var(--surface)]"
                >
                  <span className="flex items-center justify-between text-sm font-semibold text-[var(--primary)]">
                    <span>Driver on the request</span>
                    <span className="rounded-full border border-[var(--primary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] transition group-hover:bg-[var(--primary)] group-hover:text-white">
                      Select
                    </span>
                  </span>
                  <span className="text-muted mt-2 block text-sm">
                    I&apos;m driving and want to find riders to join my trip.
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleCarpoolTypeSelect("RIDER")}
                className="group surface-panel rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:bg-[var(--surface)]"
              >
                <span className="flex items-center justify-between text-sm font-semibold text-[var(--primary)]">
                  <span>Rider on request</span>
                  <span className="rounded-full border border-[var(--primary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] transition group-hover:bg-[var(--primary)] group-hover:text-white">
                    Select
                  </span>
                </span>
                <span className="text-muted mt-2 block text-sm">
                  I want to find other riders to coordinate a shared trip.
                </span>
              </button>
            </div>
            {!isDriver ? (
              <p className="text-muted mt-4 text-xs">
                Driver carpool creation is only available for users with driver access.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 text-[var(--foreground)]">
        {/* Header with greeting + MVP utility icons */}
        <header className="app-topbar brand-accent-top flex flex-wrap items-start justify-between gap-6 rounded-[30px] px-5 py-5">
          <div>
            <BrandMark href="/dashboard" />
            <p className="eyebrow mt-6">Rider Dashboard</p>
            <h1
              className={`${displayFont.className} mt-2 text-3xl sm:text-4xl`}
            >
              Welcome, {userName || "there"}👋🏽
            </h1>
            <p className="text-muted mt-1 text-sm">
              Plan your next ride, track requests, and manage your day.
            </p>
          </div>
          <DashboardUtilityNav showNotifications />
        </header>

        {/* Alerts panel with collapse toggle */}
        <section className="surface-card brand-accent-top relative mt-8 rounded-2xl p-6">
          <button
            type="button"
            onClick={() => setAlertsOpen((prev) => !prev)}
            className="absolute -top-4 left-4 flex items-center gap-2 rounded-t-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
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
                <li className="app-feedback-panel app-feedback-muted text-sm">No alerts yet.</li>
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
                      className="btn-secondary px-4 py-1 text-xs font-semibold"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-4 py-1 text-xs font-semibold"
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
          <div className="surface-card rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Status</p>
                <h2 className="text-lg font-semibold text-[var(--primary)]">
                  Ride Status
                </h2>
                <p className="text-muted mt-2 text-sm">
                  Shows upcoming rides and active requests.
                </p>
              </div>
              <span className="btn-secondary px-4 py-2 text-xs font-semibold">
                {upcomingRides.length} upcoming
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {ridesLoading && (
                <div className="app-feedback-panel app-feedback-muted app-feedback-center text-sm">
                  Loading ride status...
                </div>
              )}

              {!ridesLoading && ridesError && (
                <div className="app-feedback-panel app-feedback-error app-feedback-center">
                  <p className="text-sm">{ridesError}</p>
                </div>
              )}

              {!ridesLoading && !ridesError && upcomingRides.length === 0 && (
                <div className="app-feedback-panel app-feedback-muted app-feedback-center text-sm">
                  No upcoming rides yet.
                </div>
              )}

              {!ridesLoading && !ridesError && cancelError && (
                <div className="app-feedback-panel app-feedback-error app-feedback-center">
                  <p className="text-sm">{cancelError}</p>
                </div>
              )}

              {!ridesLoading && !ridesError && upcomingRides.length > 0 && (
                <div className="space-y-4">
              {upcomingRides.map((ride) => (
                <div
                  key={ride.id}
                  className="surface-panel rounded-2xl border-2 p-5"
                >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--primary)]">
                            {ride.dropoffLabel}
                          </h3>
                          <p className="text-muted mt-1 text-sm">
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
                      <p className="text-muted mt-2 text-sm">
                        Pickup: {ride.pickupLabel}
                      </p>
                  <p className="text-muted mt-1 text-sm">
                    Party size: {ride.partySize} • Cars needed: {ride.carsNeeded}
                  </p>
                  {/* Commented out this code to prevent ride and carpoool UIs from being cluttered by payment message info */}
                  {/* {ride.paymentSummary ? (
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
                  ) : null} */}
                  {/* Driver confirmation card only appears once a driver is matched. */}
                  {ride.status === "MATCHED" && ride.acceptedDriverId ? (
                    <div className="surface-card mt-4 rounded-2xl p-4">
                      <p className="text-muted text-xs font-semibold uppercase tracking-[0.2em]">
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
                          <p className="text-sm font-semibold text-[var(--primary)]">
                            {driverProfiles[ride.acceptedDriverId]?.name || "Driver"}
                          </p>
                          <div className="text-muted mt-2 flex items-center gap-2 text-sm">
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
                        <div className="text-muted text-right text-xs">
                          <p>
                            {reviewsCount} reviews
                          </p>
                          <Link
                            href={`/drivers/${ride.acceptedDriverId}/reviews`}
                            className="btn-secondary mt-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
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
        <section className="surface-card brand-accent-top mt-6 rounded-2xl p-5">
          <p className="eyebrow">History</p>
          <h2 className="text-lg font-semibold text-[var(--primary)]">Ride History</h2>
          <p className="text-muted mt-2 text-sm">
            Review completed and canceled rides.
          </p>
          <Link
            href="/dashboard/ride-history"
            className="btn-secondary mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
          >
            View history
          </Link>
        </section>

        {/* Primary prompt */}
        <h2
          className="font-heading mt-10 text-center text-3xl sm:text-4xl"
        >
          What would you like to do today?
        </h2>

        <div className="mt-10 grid gap-10">
          {/* Request a ride row */}
          <div className="grid gap-6 md:grid-cols-[220px_auto] md:items-center">
            <RequestButton
              label="Request a Ride"
              unstyled
              className="btn-primary w-full rounded-none px-5 py-3 text-base"
            />
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="surface-panel flex-1 rounded-2xl border-2 p-5">
                <p className="text-lg font-semibold">
                  Wanna split a ride with a friend?
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {/* Carpool creation flow */}
                  <button
                    type="button"
                    onClick={() => setCarpoolModalState(true)}
                    className="btn-secondary px-5 py-2 text-sm font-semibold"
                  >
                    Create Carpool Request
                  </button>
                  {/* Carpool discovery flow */}
                  <Link
                    href="/carpool/feed"
                    className="btn-secondary px-5 py-2 text-sm font-semibold"
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
              className="btn-primary w-full rounded-none px-5 py-3 text-base"
            >
              Offer a Ride
            </button>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="surface-panel flex-1 rounded-2xl border-2 p-5">
                <p className="text-lg font-semibold">
                  Have extra seats? Offer a ride today!
                </p>
                <p className="text-muted text-xs">
                  Help others and earn. Verified .edu email required!
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {/* Driver tools placeholder */}
                  <button
                    type="button"
                    onClick={handleDriverDashboardClick}
                    className="btn-secondary px-5 py-2 text-sm font-semibold"
                  >
                    Take me to driver dashboard
                  </button>
                  {/* Driver onboarding placeholder */}
                  <button
                    type="button"
                    onClick={handleBecomeDriverClick}
                    className="btn-secondary px-5 py-2 text-sm font-semibold"
                  >
                    Become a driver
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex justify-end">
          {/* Keep sign-out accessible from the main authenticated hub without
              competing with the landing page entry actions. */}
          <SignOutButton
            className="btn-secondary px-5 py-2 text-sm font-semibold disabled:opacity-60"
          />
        </div>
      </div>
    </main>
  );
}
