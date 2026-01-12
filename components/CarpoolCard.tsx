"use client";

import { useRouter } from "next/navigation";
import type { CarpoolThread } from "@/types/carpool";

interface CarpoolCardProps {
  carpool: CarpoolThread;
}

export default function CarpoolCard({ carpool }: CarpoolCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/carpool/${carpool.id}`);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  };

  // Format time window
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

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-green-100 text-green-700";
      case "PENDING_CONFIRMATIONS":
        return "bg-yellow-100 text-yellow-700";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-700";
      case "CANCELED":
        return "bg-red-100 text-red-700";
      case "EXPIRED":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const seatsRemaining = Math.max(0, carpool.targetGroupSize - carpool.confirmedCount);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg truncate">{carpool.destination}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(carpool.status)}`}>
              {carpool.status}
            </span>
          </div>

          {/* Date and Time */}
          <div className="text-sm text-neutral-600 mb-2">
            <span className="font-medium">{formatDate(carpool.date)}</span>
            <span className="mx-2">•</span>
            <span>{formatTimeWindow(carpool.timeWindow)}</span>
          </div>

          {/* Pickup Area */}
          <div className="text-sm text-neutral-600 mb-2">
            <span className="font-medium">Pickup:</span> {carpool.pickupArea}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <span>
              <span className="font-medium">{carpool.confirmedCount}</span> confirmed
            </span>
            <span>
              <span className="font-medium">{carpool.interestedCount}</span> interested
            </span>
            <span>
              <span className="font-medium">{seatsRemaining}</span> seats remaining
            </span>
          </div>
        </div>

      </div>
    </button>
  );
}
