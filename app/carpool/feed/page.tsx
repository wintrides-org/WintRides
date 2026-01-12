"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Playfair_Display, Work_Sans } from "next/font/google";
import CarpoolCard from "@/components/CarpoolCard";
import type { CarpoolThread } from "@/types/carpool";

// Define the fonts before the function
const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});
const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

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
    <main
      className={`min-h-screen bg-[#f4ecdf] px-6 py-12 text-[#1e3a5f] ${bodyFont.className}`}
    >
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/dashboard"
          className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
          aria-label="Back to dashboard"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        {/* Header */}
        <div className="mt-6 flex items-center justify-between mb-6">
          <div>
            <h1 className={`${displayFont.className} text-3xl font-semibold text-[#0a3570]`}>
              Carpool Feed
            </h1>
            <p className="mt-1 text-sm text-[#6b5f52]">
              Browse and join carpools for your upcoming trips
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/carpool/create")}
            className="rounded-full bg-[#0a3570] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(10,27,63,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0a2d5c]"
          >
            Create Carpool
          </button>
        </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-[#1e3a5f] bg-[#f7efe7] p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Filter by Destination</label>
            <input
              type="text"
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              placeholder="e.g., Boston Airport"
              className="rounded-xl border border-[#1e3a5f] bg-[#fdf9f3] p-2 text-[#1e3a5f] placeholder:text-[#7b6b5b] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">Filter by Date</label>
            <input
              type="date"
              value={dateFilter}
              min={today}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-xl border border-[#1e3a5f] bg-[#fdf9f3] p-2 text-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
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
            className="mt-3 rounded-full border border-[#1e3a5f] px-4 py-1 text-sm font-medium text-[#1e3a5f] transition hover:bg-[#efe3d2]"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12 text-[#6b5f52]">
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
            className="rounded-full border border-[#1e3a5f] px-5 py-2 text-sm font-medium text-[#1e3a5f] transition hover:bg-[#efe3d2]"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && carpools.length === 0 && (
        <div className="text-center py-12">
          <p className="mb-4 text-[#6b5f52]">
            {destinationFilter || dateFilter
              ? "No carpools match your filters."
              : "No carpools available yet. Be the first to create one!"}
          </p>
          <button
            type="button"
            onClick={() => router.push("/carpool/create")}
            className="rounded-full bg-[#0a3570] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(10,27,63,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0a2d5c]"
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
      </div>
    </main>
  );
}
