"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Playfair_Display, Work_Sans } from "next/font/google";

// Match the rider dashboard typography so the review flow feels consistent.
const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

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

    // Poll for fresh reviews so a driver can see new reviews appear without
    // manually refreshing the page after a rider submits one.
    async function fetchDriverAndReviews() {
      try {
        const sessionToken = localStorage.getItem("sessionToken");

        // We fetch profile metadata and public reviews together to reduce UI wait time.
        const [driverRes, reviewsRes] = await Promise.all([
          fetch(`/api/users/${driverId}`, {
            headers: sessionToken
              ? {
                  Authorization: `Bearer ${sessionToken}`,
                }
              : {},
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
      : (canceledRidesCount /(acceptedRidesCount + canceledRidesCount)) * 100;

  return (
    <main
      className={`min-h-screen bg-[#f4ecdf] px-6 py-10 text-[#0a1b3f] ${bodyFont.className}`}
    >
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5f52]">
              Driver
            </p>
            <h1 className={`${displayFont.className} mt-2 text-3xl text-[#0a3570]`}>
              {driverName}
            </h1>
            <p className="mt-2 text-sm text-[#6b5f52]">
              Ratings and reviews from riders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-[#0a3570] bg-[#fdf7ef] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a3570]"
          >
            Back
          </button>
        </header>

        <section className="mt-8 rounded-2xl border-2 border-[#0a3570] bg-[#fdf7ef] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0a3570]">Overall rating</p>
              <p className="mt-1 text-xs text-[#6b5f52]">{ratingCount} reviews</p>
              <p className="mt-2 text-xs text-[#6b5f52]">
                Canceled rides: {canceledRidesCount} ({canceledRidePercentage.toFixed(1)}% of all rides)
              </p>
            </div>
            {ratingCount === 0 ? (
              <span className="text-sm font-semibold text-[#0a3570]">
                (no rating yet)
              </span>
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
                <span className="text-sm font-semibold text-[#0a3570]">
                  {averageRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {reviews.length === 0 && (
            <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-6 text-center text-sm text-[#6b5f52]">
              No reviews yet.
            </div>
          )}

          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-[#0a3570] bg-white/90 p-5"
            >
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
                <span className="text-xs text-[#6b5f52]">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.reviewText ? (
                <p className="mt-3 text-sm text-[#0a1b3f]">{review.reviewText}</p>
              ) : null}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
