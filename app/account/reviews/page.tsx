"use client";

import { useEffect, useMemo, useState } from "react";

type ApiReview = {
  id: string;
  stars: number;
  reviewText: string | null;
  createdAt: string;
};

type ReviewSummary = {
  averageRating: number;
  ratingCount: number;
};

type DateRangePreset = "30" | "90" | "all";
type StarFilter = "all" | "5" | "4" | "3" | "2" | "1";
type SortOrder = "newest" | "oldest";

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1 text-[#f0b429]">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={`star-${count}-${index}`}
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill={index < count ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M12 17.3l-6.2 3.7 1.7-7-5.5-4.8 7.2-.6L12 2l2.8 6.6 7.2.6-5.5 4.8 1.7 7z" />
        </svg>
      ))}
    </div>
  );
}

function isWithinPreset(date: string, preset: DateRangePreset) {
  if (preset === "all") return true;

  const createdAtMs = new Date(date).getTime();
  if (!Number.isFinite(createdAtMs)) return false;

  const days = preset === "30" ? 30 : 90;
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  return createdAtMs >= cutoffMs;
}

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDriver, setIsDriver] = useState(false);
  const [summary, setSummary] = useState<ReviewSummary>({
    averageRating: 0,
    ratingCount: 0,
  });
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [dateRange, setDateRange] = useState<DateRangePreset>("all");
  const [starFilter, setStarFilter] = useState<StarFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  useEffect(() => {
    let ignore = false;

    async function loadReviews() {
      setLoading(true);
      setError("");

      try {
        const sessionToken = localStorage.getItem("sessionToken");
        const sessionRes = await fetch("/api/auth/session", {
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
        });

        const sessionData = await sessionRes.json().catch(() => null);
        if (!sessionRes.ok) {
          throw new Error(sessionData?.error || "Unable to load account reviews.");
        }

        if (ignore) return;

        const currentUserId = sessionData?.user?.id as string | undefined;
        const userIsDriver = Boolean(sessionData?.user?.isDriver);

        setIsDriver(userIsDriver);

        if (!userIsDriver || !currentUserId) {
          setSummary({ averageRating: 0, ratingCount: 0 });
          setReviews([]);
          return;
        }

        const reviewsRes = await fetch(`/api/drivers/${currentUserId}/reviews`);
        const reviewsData = await reviewsRes.json().catch(() => null);

        if (!reviewsRes.ok) {
          throw new Error(reviewsData?.error || "Unable to load reviews.");
        }

        if (ignore) return;

        setSummary({
          averageRating: Number(reviewsData?.summary?.averageRating || 0),
          ratingCount: Number(reviewsData?.summary?.ratingCount || 0),
        });
        setReviews(Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : []);
      } catch (loadError: unknown) {
        if (!ignore) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load account reviews."
          );
          setIsDriver(false);
          setSummary({ averageRating: 0, ratingCount: 0 });
          setReviews([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadReviews();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredReviews = useMemo(() => {
    const next = reviews.filter((review) => {
      if (!isWithinPreset(review.createdAt, dateRange)) {
        return false;
      }

      if (starFilter !== "all" && review.stars !== Number(starFilter)) {
        return false;
      }

      return true;
    });

    next.sort((left, right) => {
      const leftMs = new Date(left.createdAt).getTime();
      const rightMs = new Date(right.createdAt).getTime();
      return sortOrder === "newest" ? rightMs - leftMs : leftMs - rightMs;
    });

    return next;
  }, [dateRange, reviews, sortOrder, starFilter]);

  if (loading) {
    return (
      <div className="app-feedback-panel app-feedback-muted text-sm">
        Loading reviews...
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-feedback-panel app-feedback-error text-sm">
        {error}
      </div>
    );
  }

  if (!isDriver) {
    return (
      <section className="surface-card brand-accent-top rounded-[28px] p-6">
        <p className="eyebrow">Reviews</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--primary)]">
          Driver reviews will appear here
        </h2>
        <p className="text-muted mt-3 max-w-2xl text-sm">
          This page becomes active after you complete rides as a driver. Once riders
          leave feedback, you will see your rating summary and recent reviews here.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="surface-card brand-accent-top rounded-[28px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Rating snapshot</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--primary)]">
              Your rating
            </h2>
          </div>
          {summary.ratingCount === 0 ? (
            <span className="text-sm font-semibold text-[var(--primary)]">
              No ratings yet
            </span>
          ) : (
            <div className="flex items-center gap-3">
              <StarRow count={5} />
              <span className="text-2xl font-semibold text-[var(--primary)]">
                {summary.averageRating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="surface-panel rounded-full px-4 py-2 text-sm font-semibold text-[var(--primary)]">
            {summary.ratingCount} total review{summary.ratingCount === 1 ? "" : "s"}
          </div>
        </div>
      </section>

      <section className="surface-card brand-accent-top rounded-[28px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="eyebrow">Review history</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--primary)]">
              Recent rider feedback
            </h2>
            <p className="text-muted mt-2 text-sm">
              {filteredReviews.length} of {reviews.length} review
              {reviews.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <div className="grid w-full gap-3 md:w-auto md:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Date range</span>
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value as DateRangePreset)}
                className="app-input min-w-[170px]"
              >
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Star rating</span>
              <select
                value={starFilter}
                onChange={(event) => setStarFilter(event.target.value as StarFilter)}
                className="app-input min-w-[170px]"
              >
                <option value="all">All ratings</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Sort</span>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                className="app-input min-w-[170px]"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {reviews.length === 0 ? (
            <div className="app-feedback-panel app-feedback-muted app-feedback-center text-sm">
              No reviews yet.
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="app-feedback-panel app-feedback-muted app-feedback-center text-sm">
              No reviews match the selected filters.
            </div>
          ) : (
            filteredReviews.map((review) => (
              <article key={review.id} className="surface-panel rounded-[24px] border-2 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <StarRow count={review.stars} />
                    <p className="text-muted mt-2 text-xs">
                      {new Date(review.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="surface-panel rounded-full px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                    {review.stars} star{review.stars === 1 ? "" : "s"}
                  </span>
                </div>

                <p className="mt-4 text-sm text-[var(--foreground)]">
                  {review.reviewText?.trim() || "No written comment left for this review."}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
