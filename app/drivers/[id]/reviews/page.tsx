"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const displayFont = { className: "font-heading" };

type ApiReview = {
  id: string;
  stars: number;
  reviewText: string | null;
  createdAt: string;
};

export default function DriverReviewsPage() {
  const router = useRouter();
  const routeParams = useParams<{ id: string }>();
  const driverId = routeParams.id;

  const [driverName, setDriverName] = useState<string>("Driver");
  const [acceptedRidesCount, setAcceptedRidesCount] = useState(0);
  const [canceledRidesCount, setCanceledRidesCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [reviews, setReviews] = useState<ApiReview[]>([]);

  useEffect(() => {
    let ignore = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchDriverAndReviews() {
      try {
        const sessionToken = localStorage.getItem("sessionToken");

        const [driverRes, reviewsRes] = await Promise.all([
          fetch(`/api/users/${driverId}`, {
            headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
          }),
          fetch(`/api/drivers/${driverId}/reviews`),
        ]);

        if (!ignore && driverRes.ok) {
          const data = await driverRes.json().catch(() => null);
          setDriverName(data?.user?.name || "Driver");
          setAcceptedRidesCount(data?.user?.acceptedRidesCount || 0);
          setCanceledRidesCount(data?.user?.canceledRidesCount || 0);
        }

        if (!ignore && reviewsRes.ok) {
          const data = await reviewsRes.json().catch(() => null);
          setAverageRating(Number(data?.summary?.averageRating || 0));
          setRatingCount(Number(data?.summary?.ratingCount || 0));
          setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
        }
      } catch {
        if (!ignore) {
          setDriverName("Driver");
          setAcceptedRidesCount(0);
          setCanceledRidesCount(0);
          setAverageRating(0);
          setRatingCount(0);
          setReviews([]);
        }
      }
    }

    fetchDriverAndReviews();
    interval = setInterval(fetchDriverAndReviews, 15000);

    function handleFocus() {
      if (document.visibilityState === "visible") {
        fetchDriverAndReviews();
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
  }, [driverId]);

  const canceledRidePercentage =
    acceptedRidesCount === 0
      ? 0
      : (canceledRidesCount / (acceptedRidesCount + canceledRidesCount)) * 100;

  return (
    <main className="page-shell px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Driver</p>
            <h1 className={`${displayFont.className} mt-2 text-3xl text-[var(--primary)]`}>
              {driverName}
            </h1>
            <p className="text-muted mt-2 text-sm">Ratings and reviews from riders.</p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
          >
            Back
          </button>
        </header>

        <section className="surface-card mt-8 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">Overall rating</p>
              <p className="text-muted mt-1 text-xs">{ratingCount} reviews</p>
              <p className="text-muted mt-2 text-xs">
                Canceled rides: {canceledRidesCount} ({canceledRidePercentage.toFixed(1)}% of all
                rides)
              </p>
            </div>
            {ratingCount === 0 ? (
              <span className="text-sm font-semibold text-[var(--primary)]">(no rating yet)</span>
            ) : (
              <div className="flex items-center gap-2 text-[#f0b429]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <svg
                    key={`review-star-${index}`}
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M12 17.3l-6.2 3.7 1.7-7-5.5-4.8 7.2-.6L12 2l2.8 6.6 7.2.6-5.5 4.8 1.7 7z" />
                  </svg>
                ))}
                <span className="text-sm font-semibold text-[var(--primary)]">
                  {averageRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {reviews.length === 0 && (
            <div className="surface-card rounded-2xl p-6 text-center text-sm text-muted">
              No reviews yet.
            </div>
          )}

          {reviews.map((review) => (
            <div key={review.id} className="surface-card rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#f0b429]">
                  {Array.from({ length: review.stars }).map((_, index) => (
                    <svg
                      key={`review-${review.id}-star-${index}`}
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M12 17.3l-6.2 3.7 1.7-7-5.5-4.8 7.2-.6L12 2l2.8 6.6 7.2.6-5.5 4.8 1.7 7z" />
                    </svg>
                  ))}
                </div>
                <span className="text-muted text-xs">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.reviewText ? <p className="mt-3 text-sm">{review.reviewText}</p> : null}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
