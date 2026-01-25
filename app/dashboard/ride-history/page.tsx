"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Playfair_Display, Work_Sans } from "next/font/google";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const STATUS_STYLES: Record<"COMPLETED" | "CANCELED", string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-rose-100 text-rose-700",
};

type RideRequestRow = {
  id: string;
  status: "OPEN" | "MATCHED" | "COMPLETED" | "CANCELED" | "EXPIRED" | "DRAFT";
  type: "IMMEDIATE" | "SCHEDULED" | "GROUP";
  acceptedDriverId?: string | null;
  pickupLabel: string;
  dropoffLabel: string;
  pickupAt: string;
  partySize: number;
  carsNeeded: number;
};

type StoredReview = {
  id: string;
  driverId: string;
  riderId?: string;
  rideRequestId: string;
  rating: number;
  text: string;
  createdAt: string;
};

// Read stored reviews from localStorage for MVP.
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

// Persist reviews to localStorage for MVP.
function saveReviews(reviews: StoredReview[]) {
  localStorage.setItem("driverReviews", JSON.stringify(reviews));
}

export default function RiderRideHistoryPage() {
  const router = useRouter();
  const [riderId, setRiderId] = useState<string>("");
  const [requests, setRequests] = useState<RideRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<string, { rating: number; text: string }>
  >({});
  const [reviewStatus, setReviewStatus] = useState<
    Record<string, "idle" | "saving" | "saved" | "error">
  >({});
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [reviewedRideIds, setReviewedRideIds] = useState<Set<string>>(new Set());

  // Resolve the signed-in rider ID for ride-history queries.
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

  useEffect(() => {
    let ignore = false;

    // Load COMPLETED + CANCELED rides scoped to the rider session.
    async function fetchHistory() {
      setError("");
      try {
        if (!riderId) return;
        // Pass the session token so the API can authorize rider-scoped access.
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch(
          `/api/requests?status=COMPLETED,CANCELED&riderId=${riderId}`,
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

    if (riderId) {
      fetchHistory();
    }

    return () => {
      ignore = true;
    };
  }, [riderId]);

  // Load reviews once so we can disable duplicate submissions.
  useEffect(() => {
    // Track which rides already have reviews to prevent duplicates.
    const reviewed = new Set(loadReviews().map((review) => review.rideRequestId));
    setReviewedRideIds(reviewed);
  }, []);

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

  // Update per-ride review draft state (rating + text).
  function updateDraft(requestId: string, next: { rating?: number; text?: string }) {
    setReviewDrafts((prev) => ({
      ...prev,
      [requestId]: {
        rating: next.rating ?? prev[requestId]?.rating ?? 5,
        text: next.text ?? prev[requestId]?.text ?? "",
      },
    }));
  }

  // Record submission status + any validation error per ride.
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

  // Validate and store a review for a completed ride.
  function handleSubmitReview(requestId: string, driverId: string) {
    const draft = reviewDrafts[requestId] || { rating: 5, text: "" };
    if (!draft.text.trim()) {
      markReviewStatus(requestId, "error", "Please add a short review.");
      return;
    }
    if (!Number.isFinite(draft.rating) || draft.rating < 1 || draft.rating > 5) {
      markReviewStatus(requestId, "error", "Rating must be between 1 and 5.");
      return;
    }

    markReviewStatus(requestId, "saving");

    try {
      const existing = loadReviews();
      // Prevent duplicate submissions for the same ride.
      if (existing.some((review) => review.rideRequestId === requestId)) {
        markReviewStatus(requestId, "saved");
        setReviewedRideIds((prev) => new Set(prev).add(requestId));
        return;
      }

      const newReview: StoredReview = {
        id: `review_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        driverId,
        riderId: riderId || undefined,
        rideRequestId: requestId,
        rating: draft.rating,
        text: draft.text.trim(),
        createdAt: new Date().toISOString(),
      };

      saveReviews([newReview, ...existing]);
      setReviewedRideIds((prev) => new Set(prev).add(requestId));
      markReviewStatus(requestId, "saved");
    } catch {
      markReviewStatus(requestId, "error", "Failed to save review.");
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
              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-[#0a3570] bg-white/90 p-5"
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
                    <div className="mt-5 rounded-2xl border border-[#0a3570] bg-[#fdf7ef] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">
                        Rate your driver
                      </p>
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
                              Review
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
                            onClick={() =>
                              handleSubmitReview(
                                request.id,
                                request.acceptedDriverId as string
                              )
                            }
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
