"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Playfair_Display, Work_Sans } from "next/font/google";
import CarpoolChat from "@/components/CarpoolChat";
import { canCancelConfirmedParticipation } from "@/lib/carpoolDeparture";
import type { CarpoolThread } from "@/types/carpool";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

function formatDateLong(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTimeWindow(timeWindow: { start: string; end: string }) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes || "00"} ${ampm}`;
  };
  return `${formatTime(timeWindow.start)} – ${formatTime(timeWindow.end)}`;
}

function formatStartTime(time: string) {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes || "00"} ${ampm}`;
}

export default function CarpoolThreadPage() {
  const router = useRouter();
  const params = useParams();
  const carpoolId = params.id as string;

  const [carpool, setCarpool] = useState<CarpoolThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [sessionError, setSessionError] = useState<string>("");

  useEffect(() => {
    fetchCarpool();
    const interval = setInterval(fetchCarpool, 5000);
    return () => clearInterval(interval);
  }, [carpoolId]);

  useEffect(() => {
    fetchSession();
  }, []);

  async function fetchSession() {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        throw new Error("Sign in to access carpool actions.");
      }
      const data = await res.json();
      setUserId(data?.user?.id || "");
      setSessionError("");
    } catch (e: unknown) {
      setSessionError(e instanceof Error ? e.message : "Sign in to access carpool actions.");
    }
  }

  async function fetchCarpool() {
    try {
      const res = await fetch(`/api/carpools/${carpoolId}`);
      if (!res.ok) throw new Error("Failed to fetch carpool");
      const data = await res.json();
      setCarpool(data.carpool);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load carpool");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!userId) {
      setError("Sign in to join this carpool.");
      return;
    }

    setActionLoading("join");
    try {
      const res = await fetch(`/api/carpools/${carpoolId}/join`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to join carpool"
        );
      }
      const data = await res.json();
      setCarpool(data.carpool);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to join carpool");
    } finally {
      setActionLoading("");
    }
  }

  async function handleConfirm() {
    if (!userId) {
      setError("Sign in to confirm participation.");
      return;
    }

    setActionLoading("confirm");
    try {
      const res = await fetch(`/api/carpools/${carpoolId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to confirm participation"
        );
      }
      const data = await res.json();
      setCarpool(data.carpool);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to confirm participation");
    } finally {
      setActionLoading("");
    }
  }

  async function handleLeave() {
    if (!userId) {
      setError("Sign in to update your participation.");
      return;
    }

    setActionLoading("leave");
    try {
      const res = await fetch(`/api/carpools/${carpoolId}/leave`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to leave carpool"
        );
      }

      router.push("/carpool/feed");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to leave carpool");
    } finally {
      setActionLoading("");
    }
  }

  async function handleLock() {
    if (!userId) {
      setError("Sign in to lock this carpool.");
      return;
    }

    if (
      !confirm(
        "Lock this carpool? Once locked, it will move to Confirmed status and no longer be discoverable in the feed."
      )
    ) {
      return;
    }

    setActionLoading("lock");
    try {
      const res = await fetch(`/api/carpools/${carpoolId}/lock`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to lock carpool"
        );
      }
      const data = await res.json();
      setCarpool(data.carpool);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to lock carpool");
    } finally {
      setActionLoading("");
    }
  }

  async function handleCancelCarpool() {
    if (!userId) {
      setError("Sign in to cancel this carpool.");
      return;
    }

    if (!confirm("Cancel this carpool? This action cannot be undone.")) {
      return;
    }

    setActionLoading("cancel");
    try {
      const res = await fetch(`/api/carpools/${carpoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" }),
      });

      if (!res.ok) throw new Error("Failed to cancel carpool");
      const data = await res.json();
      setCarpool(data.carpool);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to cancel carpool");
    } finally {
      setActionLoading("");
    }
  }

  if (loading) {
    return (
      <main
        className={`min-h-screen bg-[#f4ecdf] p-6 text-[#1e3a5f] ${bodyFont.className} mx-auto max-w-4xl`}
      >
        <Link
          href="/carpool/feed"
          className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
          aria-label="Back to carpool feed"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="py-12 text-center text-neutral-600">Loading carpool...</div>
      </main>
    );
  }

  if (error && !carpool) {
    return (
      <main
        className={`min-h-screen bg-[#f4ecdf] p-6 text-[#1e3a5f] ${bodyFont.className} mx-auto max-w-4xl`}
      >
        <Link
          href="/carpool/feed"
          className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
          aria-label="Back to carpool feed"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="py-12 text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/carpool/feed")}
            className="rounded-xl border border-neutral-200 px-4 py-2 hover:bg-neutral-50"
          >
            Back to Feed
          </button>
        </div>
      </main>
    );
  }

  if (!carpool) return null;

  const isCreator = carpool.creatorId === userId;
  const participant = carpool.participants.find((p) => p.userId === userId);
  const isJoined = Boolean(participant);

  const phaseBrowse = !isJoined && !isCreator;
  const phaseInterested =
    isJoined && !isCreator && participant && !participant.confirmedAt;
  const phaseConfirmedRider =
    isJoined && !isCreator && Boolean(participant?.confirmedAt);

  const seatsRemaining = Math.max(0, carpool.targetGroupSize - carpool.confirmedCount);
  const canLock =
    isCreator &&
    carpool.confirmedCount >= carpool.targetGroupSize &&
    carpool.status !== "CONFIRMED";

  const riderBadge = phaseBrowse
    ? { label: "Open", className: "bg-green-100 text-green-800" }
    : phaseInterested
      ? { label: "Pending", className: "bg-[#efe3d2] text-[#6b5f52]" }
      : phaseConfirmedRider
        ? { label: "Confirmed", className: "bg-green-100 text-green-800" }
        : null;

  const hostStatusClass =
    carpool.status === "OPEN"
      ? "bg-green-100 text-green-800"
      : carpool.status === "PENDING_CONFIRMATIONS"
        ? "bg-[#efe3d2] text-[#6b5f52]"
        : carpool.status === "CONFIRMED"
          ? "bg-blue-100 text-blue-800"
          : "bg-neutral-100 text-neutral-700";

  const showChat = isCreator || phaseInterested || phaseConfirmedRider;
  const showParticipants = isCreator || isJoined;
  const canCancelConfirmed =
    phaseConfirmedRider && carpool && canCancelConfirmedParticipation(carpool);

  return (
    <main
      className={`min-h-screen bg-[#f4ecdf] p-6 text-[#1e3a5f] ${bodyFont.className} mx-auto max-w-4xl`}
    >
      <Link
        href="/carpool/feed"
        className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
        aria-label="Back to carpool feed"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
          <div className="min-w-0 flex-1">
            <h1 className={`${displayFont.className} mb-2 text-2xl font-semibold text-[#0a3570]`}>
              {carpool.destination}
            </h1>
            <div className="space-y-1 text-sm text-neutral-600">
              <p>
                <span className="font-medium text-neutral-800">Date:</span>{" "}
                {formatDateLong(carpool.date)}
              </p>
              <p>
                <span className="font-medium text-neutral-800">Time:</span>{" "}
                {formatTimeWindow(carpool.timeWindow)}
              </p>
              <p>
                <span className="font-medium text-neutral-800">Pickup:</span> {carpool.pickupArea}
              </p>
              {carpool.notes && <p className="mt-2 italic">{carpool.notes}</p>}
            </div>
          </div>
          {isCreator ? (
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${hostStatusClass}`}
            >
              {carpool.status === "PENDING_CONFIRMATIONS"
                ? "Pending"
                : carpool.status === "OPEN"
                  ? "Open"
                  : carpool.status}
            </span>
          ) : riderBadge ? (
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${riderBadge.className}`}
            >
              {riderBadge.label}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-6 pt-4 text-sm text-neutral-600">
          <div>
            <span className="font-medium text-neutral-800">{carpool.confirmedCount}</span>{" "}
            confirmed
          </div>
          <div>
            <span className="font-medium text-neutral-800">{carpool.interestedCount}</span>{" "}
            interested
          </div>
          <div>
            <span className="font-medium text-neutral-800">{seatsRemaining}</span> seats left
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {sessionError && !userId && (
        <div className="mb-4 mt-4 rounded-xl bg-[#efe3d2] p-3 text-sm text-[#6b5f52]">
          {sessionError}
        </div>
      )}

      {carpool.paymentSummary ? (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm ${
            carpool.paymentSummary.tone === "danger"
              ? "border-red-200 bg-red-50 text-red-700"
              : carpool.paymentSummary.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          <p className="font-semibold">{carpool.paymentSummary.label}</p>
          <p className="mt-1">{carpool.paymentSummary.detail}</p>
          {carpool.authorizationScheduledFor ? (
            <p className="mt-1 text-xs">
              Authorization window opens {new Date(carpool.authorizationScheduledFor).toLocaleString()}.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Phase 1 (browse on detail): interest only, no chat */}
      {phaseBrowse && carpool.status !== "CANCELED" && carpool.status !== "EXPIRED" && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="mb-4 text-sm text-neutral-600">
            Starts around <span className="font-medium">{formatStartTime(carpool.timeWindow.start)}</span>
            . No commitment until you confirm on the next step.
          </p>
          <button
            type="button"
            onClick={handleJoin}
            disabled={actionLoading !== ""}
            className="w-full rounded-xl border border-[#1e3a5f] bg-white py-3 text-sm font-semibold text-[#1e3a5f] transition hover:bg-[#f7efe7] disabled:opacity-50"
          >
            {actionLoading === "join" ? "Joining…" : "I'm interested"}
          </button>
          <p className="mt-2 text-center text-xs text-neutral-500">
            No commitment yet — you can leave anytime
          </p>
        </div>
      )}

      {/* Host actions */}
      {isCreator && (
        <div className="mt-6 flex flex-wrap gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          {canLock && (
            <button
              type="button"
              onClick={handleLock}
              disabled={actionLoading !== ""}
              className="rounded-xl bg-[#0a3570] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a2d5c] disabled:opacity-50"
            >
              {actionLoading === "lock" ? "Locking…" : "Lock carpool"}
            </button>
          )}
          {carpool.status !== "CONFIRMED" &&
            carpool.status !== "COMPLETED" &&
            carpool.status !== "CANCELED" && (
              <button
                type="button"
                onClick={handleCancelCarpool}
                disabled={actionLoading !== ""}
                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {actionLoading === "cancel" ? "Canceling…" : "Cancel carpool"}
              </button>
            )}
          {carpool.status === "CONFIRMED" && (
            <p className="w-full text-sm text-blue-800">
              Carpool is locked. Coordinate final details in chat below.
            </p>
          )}
        </div>
      )}

      {/* Phase 2: interested rider */}
      {phaseInterested && (
        <div className="mt-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={actionLoading !== ""}
              className="mb-3 w-full rounded-xl border border-[#1e3a5f] bg-white py-3 text-sm font-semibold text-[#1e3a5f] transition hover:bg-[#f7efe7] disabled:opacity-50"
            >
              {actionLoading === "confirm" ? "Confirming…" : "Confirm participation"}
            </button>
            <button
              type="button"
              onClick={handleLeave}
              disabled={actionLoading !== ""}
              className="w-full rounded-xl border border-neutral-300 bg-white py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              {actionLoading === "leave" ? "Removing…" : "Remove interest"}
            </button>
          </div>
        </div>
      )}

      {/* Phase 3: confirmed rider */}
      {phaseConfirmedRider && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-4 rounded-lg bg-[#efe3d2] px-3 py-2 text-sm text-[#6b5f52]">
            Cancel window closes 2 hours before departure.
            {!canCancelConfirmed && (
              <span className="mt-1 block font-medium">
                You can no longer cancel online — the ride is within 2 hours.
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleLeave}
            disabled={actionLoading !== "" || !canCancelConfirmed}
            className="w-full rounded-xl border border-[#1e3a5f] bg-white py-3 text-sm font-semibold text-[#1e3a5f] transition hover:bg-[#f7efe7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === "leave" ? "Leaving…" : "Cancel participation"}
          </button>
        </div>
      )}

      {showParticipants && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 border-b border-neutral-200 pb-2 font-semibold text-neutral-900">
            Participants
          </h2>
          {carpool.participants.length === 0 ? (
            <p className="text-sm text-neutral-600">No participants yet.</p>
          ) : (
            <div className="space-y-2">
              {carpool.participants.map((p) => {
                const isYou = p.userId === userId;
                const label = isYou ? "you" : p.userName;
                return (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between rounded-lg bg-neutral-50 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900">
                        {p.isCreator ? "👑 " : ""}
                        {label}
                      </span>
                      {p.isCreator && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          Creator
                        </span>
                      )}
                    </div>
                    <div className="text-xs">
                      {p.confirmedAt ? (
                        <span className="font-medium text-green-700">Confirmed</span>
                      ) : (
                        <span className="text-neutral-500">Interested</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showChat && (
        <div className="mt-6">
          <h2 className="mb-3 font-semibold text-neutral-900">Group chat</h2>
          <CarpoolChat carpoolId={carpoolId} userId={userId} />
        </div>
      )}

      {carpool.status === "CONFIRMED" && isCreator && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">Finalize details</h3>
          <p className="mb-3 text-sm text-blue-800">
            Your carpool is confirmed. Use the chat to coordinate pickup and any changes.
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
            <li>Final pickup spot</li>
            <li>Contact preferences</li>
            <li>Any last-minute changes</li>
          </ul>
        </div>
      )}
    </main>
  );
}
