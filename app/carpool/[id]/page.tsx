"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Playfair_Display, Work_Sans } from "next/font/google";
import CarpoolChat from "@/components/CarpoolChat";
import type { CarpoolThread } from "@/types/carpool";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function CarpoolThreadPage() {
  const router = useRouter();
  const params = useParams();
  const carpoolId = params.id as string;

  const [carpool, setCarpool] = useState<CarpoolThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string>("");

  // MVP: placeholder userId. Replace with real auth later.
  const userId = "user_placeholder";

  useEffect(() => {
    fetchCarpool();
    // Poll for updates every 5 seconds (MVP)
    const interval = setInterval(fetchCarpool, 5000);
    return () => clearInterval(interval);
  }, [carpoolId]);

  async function fetchCarpool() {
    try {
      const res = await fetch(`/api/carpools/${carpoolId}`);
      if (!res.ok) throw new Error("Failed to fetch carpool");
      const data = await res.json();
      setCarpool(data.carpool);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Failed to load carpool");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setActionLoading("join");
    try {
      const res = await fetch(`/api/carpools/${carpoolId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error("Failed to join carpool");
      const data = await res.json();
      setCarpool(data.carpool);
    } catch (e: any) {
      setError(e?.message || "Failed to join carpool");
    } finally {
      setActionLoading("");
    }
  }

  async function handleConfirm() {
    setActionLoading("confirm");
    try {
      const res = await fetch(`/api/carpools/${carpoolId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "confirm" }),
      });

      if (!res.ok) throw new Error("Failed to confirm participation");
      const data = await res.json();
      setCarpool(data.carpool);
    } catch (e: any) {
      setError(e?.message || "Failed to confirm participation");
    } finally {
      setActionLoading("");
    }
  }

  async function handleUnconfirm() {
    setActionLoading("unconfirm");
    try {
      const res = await fetch(`/api/carpools/${carpoolId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "unconfirm" }),
      });

      if (!res.ok) throw new Error("Failed to unconfirm");
      const data = await res.json();
      setCarpool(data.carpool);
    } catch (e: any) {
      setError(e?.message || "Failed to unconfirm");
    } finally {
      setActionLoading("");
    }
  }

  async function handleLock() {
    if (!confirm("Lock this carpool? Once locked, it will move to Confirmed status and no longer be discoverable in the feed.")) {
      return;
    }

    setActionLoading("lock");
    try {
      const res = await fetch(`/api/carpools/${carpoolId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId: userId }),
      });

      if (!res.ok) throw new Error("Failed to lock carpool");
      const data = await res.json();
      setCarpool(data.carpool);
    } catch (e: any) {
      setError(e?.message || "Failed to lock carpool");
    } finally {
      setActionLoading("");
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this carpool? This action cannot be undone.")) {
      return;
    }

    setActionLoading("cancel");
    try {
      const res = await fetch(`/api/carpools/${carpoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED", canceledAt: new Date().toISOString() }),
      });

      if (!res.ok) throw new Error("Failed to cancel carpool");
      const data = await res.json();
      setCarpool(data.carpool);
    } catch (e: any) {
      setError(e?.message || "Failed to cancel carpool");
    } finally {
      setActionLoading("");
    }
  }

  if (loading) {
    return (
      <main className={`min-h-screen bg-[#f4ecdf] p-6 text-[#1e3a5f] ${bodyFont.className} mx-auto max-w-4xl`}>
        <Link
          href="/carpool/feed"
          className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
          aria-label="Back to carpool feed"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="text-center py-12 text-neutral-600">
          Loading carpool...
        </div>
      </main>
    );
  }

  if (error && !carpool) {
    return (
      <main className={`min-h-screen bg-[#f4ecdf] p-6 text-[#1e3a5f] ${bodyFont.className} mx-auto max-w-4xl`}>
        <Link
          href="/carpool/feed"
          className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
          aria-label="Back to carpool feed"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/carpool/feed")}
            className="rounded-xl px-4 py-2 border border-neutral-200 hover:bg-neutral-50"
          >
            Back to Feed
          </button>
        </div>
      </main>
    );
  }

  if (!carpool) return null;

  // Helper functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
  };

  const formatTimeWindow = (timeWindow: { start: string; end: string }) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    return `${formatTime(timeWindow.start)} - ${formatTime(timeWindow.end)}`;
  };

  const isCreator = carpool.creatorId === userId;
  const participant = carpool.participants.find(p => p.userId === userId);
  const isJoined = !!participant;
  const isConfirmed = !!participant?.confirmedAt;
  const seatsRemaining = Math.max(0, carpool.targetGroupSize - carpool.confirmedCount);
  const canLock = isCreator && carpool.confirmedCount >= carpool.targetGroupSize && carpool.status !== "CONFIRMED";

  return (
    <main className={`min-h-screen bg-[#f4ecdf] p-6 text-[#1e3a5f] ${bodyFont.className} mx-auto max-w-4xl`}>
      <Link
        href="/carpool/feed"
        className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
        aria-label="Back to carpool feed"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>

      {/* Pinned Summary Card */}
      <div className="mb-6 p-4 rounded-xl border border-neutral-200 bg-neutral-50">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className={`${displayFont.className} text-2xl font-semibold mb-2`}>
              {carpool.destination}
            </h1>
            <div className="space-y-1 text-sm text-neutral-600">
              <p>
                <span className="font-medium">Date:</span> {formatDate(carpool.date)}
              </p>
              <p>
                <span className="font-medium">Time:</span> {formatTimeWindow(carpool.timeWindow)}
              </p>
              <p>
                <span className="font-medium">Pickup:</span> {carpool.pickupArea}
              </p>
              {carpool.notes && (
                <p className="mt-2 italic">{carpool.notes}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              carpool.status === "OPEN" ? "bg-green-100 text-green-700" :
              carpool.status === "PENDING_CONFIRMATIONS" ? "bg-yellow-100 text-yellow-700" :
              carpool.status === "CONFIRMED" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {carpool.status}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm pt-4 border-t border-neutral-200">
          <div>
            <span className="font-medium">{carpool.confirmedCount}</span> confirmed
          </div>
          <div>
            <span className="font-medium">{carpool.interestedCount}</span> interested
          </div>
          <div>
            <span className="font-medium">{seatsRemaining}</span> seats remaining
          </div>
          <div>
            <span className="font-medium">{carpool.targetGroupSize}</span> total needed
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        {!isJoined && carpool.status === "OPEN" && (
          <button
            type="button"
            onClick={handleJoin}
            disabled={actionLoading !== ""}
            className="rounded-xl px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {actionLoading === "join" ? "Joining..." : "Join Carpool"}
          </button>
        )}

        {isJoined && !isConfirmed && carpool.status !== "CONFIRMED" && (
          <>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={actionLoading !== ""}
              className="rounded-xl px-4 py-2 bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
            >
              {actionLoading === "confirm" ? "Confirming..." : "Confirm Participation"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/carpool/feed")}
              className="rounded-xl px-4 py-2 border border-neutral-200 hover:bg-neutral-50"
            >
              Leave
            </button>
          </>
        )}

        {isJoined && isConfirmed && carpool.status == "CONFIRMED" && (
          <button
            type="button"
            onClick={handleUnconfirm}
            disabled={actionLoading !== "" || carpool.status === "CONFIRMED"}
            className="rounded-xl px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {actionLoading === "unconfirm" ? "Unconfirming..." : "Unconfirm"}
          </button>
        )}

        {canLock && (
          <button
            type="button"
            onClick={handleLock}
            disabled={actionLoading !== ""}
            className="rounded-xl px-4 py-2 bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
          >
            {actionLoading === "lock" ? "Locking..." : "Lock Carpool"}
          </button>
        )}

        {isCreator && carpool.status !== "CONFIRMED" && carpool.status !== "COMPLETED" && carpool.status !== "CANCELED" && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={actionLoading !== ""}
            className="rounded-xl px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {actionLoading === "cancel" ? "Canceling..." : "Cancel Carpool"}
          </button>
        )}

        {carpool.status === "CONFIRMED" && (
          <div className="rounded-xl px-4 py-2 bg-blue-50 text-blue-700 text-sm">
            ✓ Carpool is locked and confirmed. Finalize details below.
          </div>
        )}
      </div>

      {/* Participants List */}
      <div className="mb-6 p-4 rounded-xl border border-neutral-200">
        <h2 className="font-semibold mb-3">Participants</h2>
        {carpool.participants.length === 0 ? (
          <p className="text-sm text-neutral-600">No participants yet.</p>
        ) : (
          <div className="space-y-2">
            {carpool.participants.map((p) => (
              <div
                key={p.userId}
                className="flex items-center justify-between p-2 rounded-lg bg-neutral-50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {p.isCreator ? "👑 " : ""}User {p.userId.slice(-6)}
                  </span>
                  {p.isCreator && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Creator
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-600">
                  {p.confirmedAt ? (
                    <span className="text-green-600 font-medium">✓ Confirmed</span>
                  ) : (
                    <span>Interested</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Section */}
      <div className="mb-6">
        <h2 className="font-semibold mb-3">Group Chat</h2>
        <CarpoolChat carpoolId={carpoolId} userId={userId} />
      </div>

      {/* Finalization UI (when confirmed) */}
      {carpool.status === "CONFIRMED" && (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
          <h3 className="font-semibold mb-2 text-blue-900">Finalize Details</h3>
          <p className="text-sm text-blue-700 mb-3">
            Your carpool is confirmed! Use the chat to coordinate:
          </p>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Final pickup spot</li>
            <li>Contact preferences</li>
            <li>Any last-minute changes</li>
          </ul>
        </div>
      )}
    </main>
  );
}
