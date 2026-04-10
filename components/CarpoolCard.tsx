"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CarpoolThread } from "@/types/carpool";

interface CarpoolCardProps {
  carpool: CarpoolThread;
  userId?: string;
}

export default function CarpoolCard({ carpool, userId = "" }: CarpoolCardProps) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [localError, setLocalError] = useState("");

  const participant = userId
    ? carpool.participants.find((p) => p.userId === userId)
    : undefined;
  const isCreator = Boolean(participant?.isCreator);
  const isConfirmed = Boolean(participant?.confirmedAt);
  const seatsRemaining = Math.max(0, carpool.targetGroupSize - carpool.confirmedCount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  };

  const formatStartTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes || "00"} ${ampm}`;
  };

  const feedStatusBadge =
    carpool.status === "OPEN" || carpool.status === "PENDING_CONFIRMATIONS"
      ? { label: "Open", className: "bg-green-100 text-green-800" }
      : carpool.status === "CONFIRMED"
        ? { label: "Confirmed", className: "bg-blue-100 text-blue-800" }
        : { label: carpool.status, className: "bg-neutral-100 text-neutral-700" };

  async function handleInterested(e: React.MouseEvent) {
    e.stopPropagation();
    setLocalError("");
    if (!userId) {
      router.push("/signin");
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/carpools/${carpool.id}/join`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not join this carpool.");
      }
      router.push(`/carpool/${carpool.id}`);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setJoining(false);
    }
  }

  function goToRide(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/carpool/${carpool.id}`);
  }

  let primaryAction: React.ReactNode;
  if (isCreator) {
    primaryAction = (
      <button
        type="button"
        onClick={goToRide}
        className="w-full rounded-xl border border-[#1e3a5f] bg-white py-3 text-sm font-semibold text-[#1e3a5f] transition hover:bg-[#f7efe7]"
      >
        Manage ride
      </button>
    );
  } else if (participant && isConfirmed) {
    primaryAction = (
      <button
        type="button"
        onClick={goToRide}
        className="w-full rounded-xl border border-[#1e3a5f] bg-white py-3 text-sm font-semibold text-[#1e3a5f] transition hover:bg-[#f7efe7]"
      >
        View ride
      </button>
    );
  } else if (participant) {
    primaryAction = (
      <button
        type="button"
        onClick={goToRide}
        className="w-full rounded-xl border border-[#1e3a5f] bg-white py-3 text-sm font-semibold text-[#1e3a5f] transition hover:bg-[#f7efe7]"
      >
        Continue to chat
      </button>
    );
  } else {
    primaryAction = (
      <button
        type="button"
        onClick={handleInterested}
        disabled={joining}
        className="w-full rounded-xl border border-[#1e3a5f] bg-white py-3 text-sm font-semibold text-[#1e3a5f] transition hover:bg-[#f7efe7] disabled:opacity-50"
      >
        {joining ? "Joining…" : "I'm interested"}
      </button>
    );
  }

  return (
    <article className="w-full rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-neutral-900">
            {carpool.destination}
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            <span className="font-medium">{formatDate(carpool.date)}</span>
            <span className="mx-2">•</span>
            <span>{formatStartTime(carpool.timeWindow.start)}</span>
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            <span className="font-medium">Pickup:</span> {carpool.pickupArea}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${feedStatusBadge.className}`}
        >
          {feedStatusBadge.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-200 pt-4 text-sm text-neutral-600">
        <span>
          <span className="font-medium text-neutral-800">{carpool.confirmedCount}</span>{" "}
          confirmed
        </span>
        <span>
          <span className="font-medium text-neutral-800">{carpool.interestedCount}</span>{" "}
          interested
        </span>
        <span>
          <span className="font-medium text-neutral-800">{seatsRemaining}</span> seats left
        </span>
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4">
        {primaryAction}
        {!participant && !isCreator && (
          <p className="mt-2 text-center text-xs text-neutral-500">
            No commitment yet — you can leave anytime
          </p>
        )}
        {localError && (
          <p className="mt-2 text-center text-xs text-red-600">{localError}</p>
        )}
      </div>
    </article>
  );
}
