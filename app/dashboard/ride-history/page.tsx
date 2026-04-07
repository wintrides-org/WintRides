"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Playfair_Display, Work_Sans } from "next/font/google";

// Page fonts (kept consistent with the rest of the dashboard UI).
const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Badge color mapping for ride status chips in the history list.
const STATUS_STYLES: Record<"COMPLETED" | "CANCELED", string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-rose-100 text-rose-700",
};

// Riders can submit a review for up to 7 days after ride completion.
const REVIEW_WINDOW_DAYS = 7;

type RideRequestRow = {
  id: string;
  status: "OPEN" | "MATCHED" | "COMPLETED" | "CANCELED" | "EXPIRED" | "DRAFT";
  type: "IMMEDIATE" | "SCHEDULED" | "GROUP";
  acceptedDriverId?: string | null;
  pickupLabel: string;
  dropoffLabel: string;
  pickupAt: string;
  completedAt?: string | null;
  partySize: number;
  carsNeeded: number;
};

// Checks whether a ride is still eligible for review submission.
function isReviewWindowOpen(completedAt?: string | null): boolean {
  if (!completedAt) return false;
  const completedAtMs = new Date(completedAt).getTime();
  if (!Number.isFinite(completedAtMs)) return false;
  const deadlineMs = completedAtMs + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() <= deadlineMs;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function RideHistoryFallback() {
  return (
    <main className={`min-h-screen bg-[#f4ecdf] px-6 py-10 text-[#0a1b3f] ${bodyFont.className}`}>
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl border border-[#0a3570] bg-[#fdf7ef] p-6 text-center text-sm text-[#6b5f52]">
          Loading ride history...
        </div>
      </div>
    </main>
  );
}

function RiderRideHistoryContent() {
  const router = useRouter();
  // If the rider came from the dashboard review prompt, this query param tells
  // us which completed ride should be emphasized on the page.
  const searchParams = useSearchParams();
  const highlightedRideId = searchParams.get("reviewRideId");

  // Core page data.
  const [riderId, setRiderId] = useState<string>("");
  const [requests, setRequests] = useState<RideRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Per-ride local form state for review drafts.
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<string, { rating: number; text: string }>
  >({});

  // Per-ride submission status.
  const [reviewStatus, setReviewStatus] = useState<
    Record<string, "idle" | "saving" | "saved" | "error">
  >({});
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});

  // Set of ride IDs already reviewed by the current rider.
  const [reviewedRideIds, setReviewedRideIds] = useState<Set<string>>(new Set());

  // 1) Resolve the signed-in user from the session API so we can scope ride history + review actions.
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
          setRiderId(data?.user?.id || "");
        }
      } catch {
        if (!ignore) {
          setRiderId("");
        }
      }
    }

    fetchSession();

    return () => {
      ignore = true;
    };
  }, []);

  // 2) Fetch rider history (completed + canceled) for the signed-in rider.
  useEffect(() => {
    let ignore = false;

    async function fetchHistory() {
      setError("");
      try {
        if (!riderId) return;
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch(
          `/api/requests?status=COMPLETED,CANCELED&participantId=${riderId}`,
          {
            headers: sessionToken
              ? {
                  Authorization: `Bearer ${sessionToken}`,
                }
              : {},
          }
        );
        if (!res.ok) {
          throw new Error("Failed to load ride history.");
        }
        const data = await res.json();
        if (!ignore) {
          setRequests(data.requests || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(getErrorMessage(err, "Failed to load ride history."));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (riderId) {
      fetchHistory();
    }

    return () => {
      ignore = true;
    };
  }, [riderId]);

  // 3) Fetch already-written reviews to disable duplicate submissions in the UI.
  useEffect(() => {
    let ignore = false;

    async function fetchExistingReviews() {
      try {
        if (!riderId) return;
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch(`/api/reviews?riderId=${riderId}`, {
          headers: sessionToken
            ? {
                Authorization: `Bearer ${sessionToken}`,
              }
            : {},
        });

        if (!res.ok) return;
        const data = await res.json();
        const reviewed = new Set<string>(
          Array.isArray(data?.reviews)
            ? data.reviews.map((review: { rideRequestId: string }) => review.rideRequestId)
            : []
        );

        if (!ignore) {
          setReviewedRideIds(reviewed);
        }
      } catch {
        if (!ignore) {
          setReviewedRideIds(new Set());
        }
      }
    }

    fetchExistingReviews();

    return () => {
      ignore = true;
    };
  }, [riderId]);

  // Derived UI-friendly date string for pickup timestamps.
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
      })),
    [requests]
  );

  // When Ride History is opened from the dashboard review prompt, scroll the
  // targeted ride into view so the rider lands on the correct review form.
  useEffect(() => {
    if (!highlightedRideId || loading) return;

    // The review form container gets an id like `review-<rideId>`.
    const targetedElement = document.getElementById(`review-${highlightedRideId}`);
    if (!targetedElement) return;

    targetedElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [highlightedRideId, loading, requests]);

  // Update draft rating/text per ride.
  function updateDraft(requestId: string, next: { rating?: number; text?: string }) {
    setReviewDrafts((prev) => ({
      ...prev,
      [requestId]: {
        rating: next.rating ?? prev[requestId]?.rating ?? 5,
        text: next.text ?? prev[requestId]?.text ?? "",
      },
    }));
  }

  // Shared helper for setting current save state and any per-ride error text.
  function markReviewStatus(
    requestId: string,
    status: "idle" | "saving" | "saved" | "error",
    message?: string
  ) {
    setReviewStatus((prev) => ({ ...prev, [requestId]: status }));
    setReviewErrors((prev) => ({
      ...prev,
      [requestId]: message || "",
    }));
  }

  // Submit a review to the backend API.
  // Server enforces: one review per ride, completed ride only, and 7-day review window.
  async function handleSubmitReview(requestId: string) {
    const draft = reviewDrafts[requestId] || { rating: 5, text: "" };

    if (!Number.isFinite(draft.rating) || draft.rating < 1 || draft.rating > 5) {
      markReviewStatus(requestId, "error", "Rating must be between 1 and 5.");
      return;
    }

    markReviewStatus(requestId, "saving");

    try {
      const sessionToken = localStorage.getItem("sessionToken");
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          rideRequestId: requestId,
          stars: draft.rating,
          reviewText: draft.text.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save review.");
      }

      // Mark this ride as reviewed to immediately flip the UI state.
      setReviewedRideIds((prev) => new Set(prev).add(requestId));
      markReviewStatus(requestId, "saved");
    } catch (err: unknown) {
      markReviewStatus(requestId, "error", getErrorMessage(err, "Failed to save review."));
    }
  }

  return (
    <main
      className={`min-h-screen bg-[#f4ecdf] px-6 py-10 text-[#0a1b3f] ${bodyFont.className}`}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5f52]">
            Rider
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className={`${displayFont.className} text-3xl text-[#0a3570]`}>
              Ride History
            </h1>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-[#0a3570] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a3570] hover:bg-[#e9dcc9]"
            >
              Back
            </button>
          </div>
          <p className="mt-2 text-sm text-[#6b5f52]">
            Completed and canceled rides.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0a3570] bg-white/80 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-[#0a3570]">
              Past rides
            </p>
            <p className="mt-1 text-xs text-[#6b5f52]">
              COMPLETED and CANCELED.
            </p>
          </div>
          <span className="rounded-full border border-[#0a3570] bg-[#f6efe6] px-4 py-2 text-xs font-semibold text-[#0a3570]">
            {requests.length} rides
          </span>
        </div>

        <section className="space-y-4">
          {loading && (
            <div className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-6 text-center text-sm text-[#6b5f52]">
              Loading ride history...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && formatted.length === 0 && (
            <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-6 text-center text-sm text-[#6b5f52]">
              No rides yet.
            </div>
          )}

          {!loading && !error && formatted.length > 0 && (
            <div className="space-y-4">
              {formatted.map((request) => {
                const statusTone =
                  STATUS_STYLES[request.status as "COMPLETED" | "CANCELED"] ||
                  STATUS_STYLES.COMPLETED;
                const reviewWindowOpen = isReviewWindowOpen(request.completedAt);
                // Use the query param to visually distinguish the ride selected
                // from the dashboard prompt from all the other history cards.
                const isHighlightedRide = highlightedRideId === request.id;

                return (
                  <div
                    key={request.id}
                    className={`rounded-2xl border p-5 ${
                      isHighlightedRide
                        ? "border-2 border-[#d08a2d] bg-[#fff7e8] shadow-[0_12px_24px_rgba(208,138,45,0.18)]"
                        : "border-[#0a3570] bg-white/90"
                    }`}
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
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <div className="mt-4 text-sm text-[#0a1b3f]">
                      <span className="font-semibold">Pickup:</span>{" "}
                      {request.pickupLabel}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#0a1b3f]">
                      <span>
                        <span className="font-semibold">Party size:</span>{" "}
                        {request.partySize}
                      </span>
                      <span>
                        <span className="font-semibold">Cars needed:</span>{" "}
                        {request.carsNeeded}
                      </span>
                    </div>

                    {request.status === "COMPLETED" && request.acceptedDriverId ? (
                      <div
                        id={`review-${request.id}`}
                        className={`mt-5 rounded-2xl border p-4 ${
                          isHighlightedRide
                            ? "border-[#d08a2d] bg-[#fff1cf]"
                            : "border-[#0a3570] bg-[#fdf7ef]"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">
                          Rate your driver
                        </p>
                        {isHighlightedRide ? (
                          <p className="mt-2 text-sm font-medium text-[#8a5a12]">
                            Review this completed ride here.
                          </p>
                        ) : null}

                        {reviewedRideIds.has(request.id) ? (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#0a1b3f]">
                            <span>Review submitted.</span>
                            <Link
                              href={`/drivers/${request.acceptedDriverId}/reviews`}
                              className="rounded-full border border-[#0a3570] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a3570] hover:bg-[#e9dcc9]"
                            >
                              View reviews
                            </Link>
                          </div>
                        ) : !reviewWindowOpen ? (
                          <p className="mt-3 text-sm text-[#6b5f52]">
                            Review window closed. Reviews can only be submitted within 7 days of ride completion.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">
                              Rating
                            </label>
                            <select
                              value={reviewDrafts[request.id]?.rating ?? 5}
                              onChange={(event) =>
                                updateDraft(request.id, {
                                  rating: Number(event.target.value),
                                })
                              }
                              className="mt-2 w-full rounded-xl border border-[#c9b9a3] bg-white px-4 py-2 text-sm text-[#0a1b3f] focus:border-[#0a3570] focus:outline-none"
                            >
                              {[5, 4, 3, 2, 1].map((value) => (
                                <option key={value} value={value}>
                                  {value} stars
                                </option>
                              ))}
                            </select>

                            <div>
                              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">
                                Review (optional)
                              </label>
                              <textarea
                                value={reviewDrafts[request.id]?.text ?? ""}
                                onChange={(event) =>
                                  updateDraft(request.id, { text: event.target.value })
                                }
                                rows={3}
                                className="mt-2 w-full rounded-xl border border-[#c9b9a3] bg-white px-4 py-2 text-sm text-[#0a1b3f] focus:border-[#0a3570] focus:outline-none"
                                placeholder="Share how the ride went."
                              />
                            </div>

                            {reviewErrors[request.id] ? (
                              <p className="text-sm text-red-600">
                                {reviewErrors[request.id]}
                              </p>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleSubmitReview(request.id)}
                              disabled={reviewStatus[request.id] === "saving"}
                              className="rounded-full border border-[#0a3570] bg-[#0a3570] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#092a59] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {reviewStatus[request.id] === "saving"
                                ? "Submitting..."
                                : "Submit review"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="mt-5">
                      <Link
                        href="/dashboard"
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b5f52]"
                      >
                        Back to dashboard
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function RiderRideHistoryPage() {
  return (
    <Suspense fallback={<RideHistoryFallback />}>
      <RiderRideHistoryContent />
    </Suspense>
  );
}
