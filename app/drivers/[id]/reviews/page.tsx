"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type StoredReview = {
  id: string;
  driverId: string;
  riderId?: string;
  rideRequestId?: string;
  rating: number;
  text: string;
  createdAt: string;
};

// Read reviews from localStorage for MVP storage.
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

export default function DriverReviewsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const driverId = params.id;
  const [driverName, setDriverName] = useState<string>("Driver");
  const [reviews, setReviews] = useState<StoredReview[]>([]);

  useEffect(() => {
    let ignore = false;

    // Fetch the driver's display name for the review header.
    async function fetchDriver() {
      try {
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch(`/api/users/${driverId}`, {
          headers: sessionToken
            ? {
                Authorization: `Bearer ${sessionToken}`,
              }
            : {},
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!ignore) {
          setDriverName(data?.user?.name || "Driver");
        }
      } catch {
        if (!ignore) {
          setDriverName("Driver");
        }
      }
    }

    fetchDriver();

    return () => {
      ignore = true;
    };
  }, [driverId]);

  useEffect(() => {
    // Load and filter reviews for this driver only.
    const all = loadReviews();
    setReviews(all.filter((review) => review.driverId === driverId));
  }, [driverId]);

  const summary = useMemo(() => {
    // Compute average rating and review count for the header card.
    if (reviews.length === 0) {
      return { average: 0, count: 0 };
    }
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return { average: total / reviews.length, count: reviews.length };
  }, [reviews]);

  return (
    <main className="min-h-screen bg-[#f4ecdf] px-6 py-10 text-[#0a1b3f]">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5f52]">
              Driver
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{driverName}</h1>
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
              <p className="mt-1 text-xs text-[#6b5f52]">{summary.count} reviews</p>
            </div>
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
                {summary.count === 0 ? "No ratings yet" : summary.average.toFixed(1)}
              </span>
            </div>
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
                  {Array.from({ length: review.rating }).map((_, index) => (
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
              <p className="mt-3 text-sm text-[#0a1b3f]">{review.text}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
