"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarpoolCard from "@/components/CarpoolCard";
import type { CarpoolThread } from "@/types/carpool";

export default function CarpoolFeedPage() {
  const router = useRouter();
  const [carpools, setCarpools] = useState<CarpoolThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Filters
  const [destinationFilter, setDestinationFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    fetchCarpools();
  }, [destinationFilter, dateFilter]);

  async function fetchCarpools() {
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
      // Only show open carpools in feed (MVP)
      params.append("status", "OPEN,PENDING_CONFIRMATIONS");

      const res = await fetch(`/api/carpools?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error("Failed to fetch carpools");
      }

      const data = await res.json();
      setCarpools(data.carpools || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load carpools");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <main className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Carpool Feed</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Browse and join carpools for your upcoming trips
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/carpool/create")}
          className="rounded-xl px-4 py-2 font-medium border border-neutral-200 bg-white hover:bg-neutral-50"
        >
          Create Carpool
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 rounded-xl border border-neutral-200 bg-neutral-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Filter by Destination</label>
            <input
              type="text"
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              placeholder="e.g., Boston Airport"
              className="rounded-xl border p-2 bg-white"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">Filter by Date</label>
            <input
              type="date"
              value={dateFilter}
              min={today}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-xl border p-2 bg-white"
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
            className="mt-3 text-sm text-neutral-600 hover:text-neutral-900"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12 text-neutral-600">
          Loading carpools...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchCarpools}
            className="rounded-xl px-4 py-2 border border-neutral-200 hover:bg-neutral-50"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && carpools.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-600 mb-4">
            {destinationFilter || dateFilter
              ? "No carpools match your filters."
              : "No carpools available yet. Be the first to create one!"}
          </p>
          <button
            type="button"
            onClick={() => router.push("/carpool/create")}
            className="rounded-xl px-4 py-2 border border-neutral-200 bg-white hover:bg-neutral-50"
          >
            Create Carpool
          </button>
        </div>
      )}

      {/* Carpool list */}
      {!loading && !error && carpools.length > 0 && (
        <div className="grid gap-4">
          {carpools.map((carpool) => (
            <CarpoolCard key={carpool.id} carpool={carpool} />
          ))}
        </div>
      )}
    </main>
  );
}

