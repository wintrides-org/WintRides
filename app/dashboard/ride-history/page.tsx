"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const displayFont = { className: "font-heading" };

const STATUS_STYLES: Record<"COMPLETED" | "CANCELED", string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-rose-100 text-rose-700",
};

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
    <main className="page-shell px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="surface-card rounded-2xl p-6 text-center text-sm text-muted">
          Loading ride history...
        </div>
      </div>
    </main>
  );
}

function RiderRideHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedRideId = searchParams.get("reviewRideId");

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

    async function fetchHistory() {
      setError("");
      try {
        if (!riderId) return;
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch(
          `/api/requests?status=COMPLETED,CANCELED&participantId=${riderId}`,
          {
            headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
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

  useEffect(() => {
    let ignore = false;

    async function fetchExistingReviews() {
      try {
        if (!riderId) return;
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch(`/api/reviews?riderId=${riderId}`, {
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
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

  useEffect(() => {
    if (!highlightedRideId || loading) return;
    const targetedElement = document.getElementById(`review-${highlightedRideId}`);
    if (!targetedElement) return;

    targetedElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [highlightedRideId, loading, requests]);

  function updateDraft(requestId: string, next: { rating?: number; text?: string }) {
    setReviewDrafts((prev) => ({
      ...prev,
      [requestId]: {
        rating: next.rating ?? prev[requestId]?.rating ?? 5,
        text: next.text ?? prev[requestId]?.text ?? "",
      },
    }));
  }

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

      setReviewedRideIds((prev) => new Set(prev).add(requestId));
      markReviewStatus(requestId, "saved");
    } catch (err: unknown) {
      markReviewStatus(requestId, "error", getErrorMessage(err, "Failed to save review."));
    }
  }

  return (
    <main className="page-shell px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="brand-accent-top rounded-[28px] px-5 py-5">
          <p className="eyebrow">Rider</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className={`${displayFont.className} text-3xl text-[var(--primary)]`}>
              Ride History
            </h1>
            <button
              type="button"
              onClick={() => router.back()}
              className="icon-button h-12 w-12"
              aria-label="Back"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>
          <p className="text-muted mt-2 text-sm">Completed and canceled rides.</p>
        </header>

        <div className="surface-card brand-accent-top flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
          <div>
            <p className="eyebrow">Summary</p>
            <p className="mt-1 text-sm font-semibold text-[var(--primary)]">Past rides</p>
            <p className="text-muted mt-1 text-xs">Completed and canceled rides.</p>
          </div>
          <span className="btn-secondary px-4 py-2 text-xs font-semibold">
            {requests.length} rides
          </span>
        </div>

        <section className="space-y-4">
          {loading && (
            <div className="surface-panel rounded-2xl border-dashed p-6 text-center text-sm text-muted">
              Loading ride history...
            </div>
          )}

          {!loading && error && (
            <div className="surface-card rounded-2xl p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && formatted.length === 0 && (
            <div className="surface-card rounded-2xl p-6 text-center text-sm text-muted">
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
                const isHighlightedRide = highlightedRideId === request.id;

                return (
                  <div
                    key={request.id}
                    className={`rounded-2xl border p-5 ${
                      isHighlightedRide
                        ? "border-2 border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--background))] shadow-[var(--shadow-strong)]"
                        : "surface-card"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--primary)]">
                          {request.dropoffLabel}
                        </h2>
                        <p className="text-muted mt-1 text-sm">{request.pickupTime}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <div className="mt-4 text-sm">
                      <span className="font-semibold">Pickup:</span> {request.pickupLabel}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                      <span>
                        <span className="font-semibold">Party size:</span> {request.partySize}
                      </span>
                      <span>
                        <span className="font-semibold">Cars needed:</span> {request.carsNeeded}
                      </span>
                    </div>

                    {request.status === "COMPLETED" && request.acceptedDriverId ? (
                      <div
                        id={`review-${request.id}`}
                        className={`mt-5 rounded-2xl border p-4 ${
                          isHighlightedRide
                            ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,var(--background))]"
                            : "surface-panel"
                        }`}
                      >
                        <p className="eyebrow">Rate your driver</p>
                        {isHighlightedRide ? (
                          <p className="mt-2 text-sm font-medium text-[var(--primary)]">
                            Review this completed ride here.
                          </p>
                        ) : null}

                        {reviewedRideIds.has(request.id) ? (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                            <span>Review submitted.</span>
                            <Link
                              href={`/drivers/${request.acceptedDriverId}/reviews`}
                              className="btn-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                            >
                              View reviews
                            </Link>
                          </div>
                        ) : !reviewWindowOpen ? (
                          <p className="text-muted mt-3 text-sm">
                            Review window closed. Reviews can only be submitted within 7 days of
                            ride completion.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            <label className="eyebrow">Rating</label>
                            <select
                              value={reviewDrafts[request.id]?.rating ?? 5}
                              onChange={(event) =>
                                updateDraft(request.id, {
                                  rating: Number(event.target.value),
                                })
                              }
                              className="app-input mt-2 w-full rounded-xl px-4 py-2 text-sm"
                            >
                              {[5, 4, 3, 2, 1].map((value) => (
                                <option key={value} value={value}>
                                  {value} stars
                                </option>
                              ))}
                            </select>

                            <div>
                              <label className="eyebrow">Review (optional)</label>
                              <textarea
                                value={reviewDrafts[request.id]?.text ?? ""}
                                onChange={(event) =>
                                  updateDraft(request.id, { text: event.target.value })
                                }
                                rows={3}
                                className="app-input mt-2 w-full rounded-xl px-4 py-2 text-sm"
                                placeholder="Share how the ride went."
                              />
                            </div>

                            {reviewErrors[request.id] ? (
                              <p className="text-sm text-red-600">{reviewErrors[request.id]}</p>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleSubmitReview(request.id)}
                              disabled={reviewStatus[request.id] === "saving"}
                              className="btn-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-70"
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
                        className="text-muted text-xs font-semibold uppercase tracking-[0.18em]"
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
