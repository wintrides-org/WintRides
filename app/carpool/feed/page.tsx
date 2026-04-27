"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CarpoolCard from "@/components/CarpoolCard";
import type { CarpoolThread } from "@/types/carpool";

const displayFont = { className: "font-heading" };

export default function CarpoolFeedPage() {
  const router = useRouter();

  const [carpools, setCarpools] = useState<CarpoolThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [destinationFilter, setDestinationFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  const fetchCarpools = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (destinationFilter) {
        params.append("destination", destinationFilter);
      }
      if (dateFilter) {
        params.append("date", dateFilter);
      }
      params.append("status", "OPEN,PENDING_CONFIRMATIONS");

      const res = await fetch(`/api/carpools?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Failed to fetch carpools");
      }

      const data = await res.json();
      setCarpools(data.carpools || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load carpools");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, destinationFilter]);

  useEffect(() => {
    fetchCarpools();
  }, [fetchCarpools]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) return;
        const data = await res.json();
        setUserId(data?.user?.id || "");
      } catch {
        // guest feed
      }
    })();
  }, []);

  const today = new Date().toISOString().split("T")[0];

  return (
    <main className="page-shell px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <Link href="/dashboard" className="icon-button h-12 w-12" aria-label="Back to dashboard">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        <div className="mb-6 mt-6 flex items-center justify-between">
          <div>
            <h1 className={`${displayFont.className} text-3xl font-semibold text-[var(--primary)]`}>
              Carpool Feed
            </h1>
            <p className="text-muted mt-1 text-sm">
              Browse and join carpools for your upcoming trips
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard?carpoolOptions=1")}
            className="btn-primary px-5 py-2 text-sm font-semibold"
          >
            Create Carpool
          </button>
        </div>

        <div className="surface-card mb-6 rounded-2xl p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Filter by Destination</label>
              <input
                type="text"
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
                placeholder="e.g., Boston Airport"
                className="app-input rounded-xl p-2"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium">Filter by Date</label>
              <input
                type="date"
                value={dateFilter}
                min={today}
                onChange={(e) => setDateFilter(e.target.value)}
                className="app-input rounded-xl p-2"
              />
            </div>
          </div>

          {(destinationFilter || dateFilter) && (
            <button
              type="button"
              onClick={() => {
                setDestinationFilter("");
                setDateFilter("");
              }}
              className="btn-secondary mt-3 px-4 py-1 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading && <div className="text-muted py-12 text-center">Loading carpools...</div>}

        {error && !loading && (
          <div className="py-12 text-center">
            <p className="mb-4 text-red-600">{error}</p>
            <button
              type="button"
              onClick={fetchCarpools}
              className="btn-secondary px-5 py-2 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && carpools.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted mb-4">
              {destinationFilter || dateFilter
                ? "No carpools match your filters."
                : "No carpools available yet. Be the first to create one!"}
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard?carpoolOptions=1")}
              className="btn-primary px-5 py-2 text-sm font-semibold"
            >
              Create Carpool
            </button>
          </div>
        )}

        {!loading && !error && carpools.length > 0 && (
          <div className="grid gap-4">
            {carpools.map((carpool) => (
              <CarpoolCard key={carpool.id} carpool={carpool} userId={userId} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
