"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_COPY: Record<"OPEN" | "MATCHED", { label: string; tone: string }> = {
  OPEN: { label: "OPEN", tone: "bg-amber-100 text-amber-800" },
  MATCHED: { label: "MATCHED", tone: "bg-emerald-100 text-emerald-700" },
};

type RideRequestRow = {
  id: string;
  status: "OPEN" | "MATCHED" | "COMPLETED" | "CANCELED" | "EXPIRED" | "DRAFT";
  type: "IMMEDIATE" | "SCHEDULED" | "GROUP";
  pickupLabel: string;
  dropoffLabel: string;
  pickupAt: string;
  partySize: number;
  carsNeeded: number;
};

export default function RiderRideStatusPage() {
  const router = useRouter();
  const [riderId, setRiderId] = useState<string>("");
  const [requests, setRequests] = useState<RideRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState("");

  // Resolve the signed-in rider ID for ride-status queries.
  useEffect(() => {
    let ignore = false;

    async function fetchSession() {
      try {
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch("/api/auth/session", {
          headers: sessionToken
            ? {
                Authorization: `Bearer ${sessionToken}`,
              }
            : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) {
          setRiderId(data?.user?.id || "");
        }
      } catch {
        if (!ignore) {
          setRiderId("");
        }
      }
    }

    fetchSession();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    // Load OPEN + MATCHED rides scoped to the rider session.
    async function fetchStatus() {
      setError("");
      try {
        if (!riderId) return;
        // Pass the session token so the API can authorize rider-scoped access.
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch(
          `/api/requests?status=OPEN,MATCHED&riderId=${riderId}`,
          {
            headers: sessionToken
              ? {
                  Authorization: `Bearer ${sessionToken}`,
                }
              : {},
          }
        );
        if (!res.ok) {
          throw new Error("Failed to load ride status.");
        }
        const data = await res.json();
        if (!ignore) {
          setRequests(data.requests || []);
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.message || "Failed to load ride status.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (riderId) {
      fetchStatus();
    }

    return () => {
      ignore = true;
    };
  }, [riderId]);

  const formatted = useMemo(
    () =>
      requests.map((request) => ({
        ...request,
        pickupTime: new Date(request.pickupAt).toLocaleString([], {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      })),
    [requests]
  );

  // Cancel an upcoming ride via the API and update the local list.
  async function handleCancel(requestId: string) {
    setCancelError("");

    if (!confirm("Cancel this ride request?")) return;

    setCancelingId(requestId);
    try {
      // Call the cancel API route (updates status in the database).
      const sessionToken = localStorage.getItem("sessionToken");
      const res = await fetch("/api/requests/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ requestId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to cancel ride.");
      }
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err: any) {
      setCancelError(err?.message || "Failed to cancel ride.");
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5f52]">
          Rider
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Ride Status</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-[#0a3570] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a3570] hover:bg-[#e9dcc9]"
          >
            Back
          </button>
        </div>
        <p className="mt-2 text-sm text-[#6b5f52]">
          Track upcoming rides and manage active requests.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0a3570] bg-white/80 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-[#0a3570]">
            Upcoming requests
          </p>
          <p className="mt-1 text-xs text-[#6b5f52]">
            OPEN and MATCHED rides.
          </p>
        </div>
        <span className="rounded-full border border-[#0a3570] bg-[#f6efe6] px-4 py-2 text-xs font-semibold text-[#0a3570]">
          {requests.length} active
        </span>
      </div>

      <section className="space-y-4">
        {loading && (
          <div className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-6 text-center text-sm text-[#6b5f52]">
            Loading ride status...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && formatted.length === 0 && (
          <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-6 text-center text-sm text-[#6b5f52]">
            No upcoming rides yet.
          </div>
        )}

        {!loading && !error && cancelError && (
          <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-4 text-center">
            <p className="text-sm text-red-600">{cancelError}</p>
          </div>
        )}

        {!loading && !error && formatted.length > 0 && (
          <div className="space-y-4">
            {formatted.map((request) => {
              const statusMeta =
                STATUS_COPY[request.status as "OPEN" | "MATCHED"] ||
                STATUS_COPY.OPEN;
              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-[#0a3570] bg-white/90 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0a3570]">
                        {request.dropoffLabel}
                      </h2>
                      <p className="mt-1 text-sm text-[#6b5f52]">
                        {request.pickupTime}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="mt-4 text-sm text-[#0a1b3f]">
                    <span className="font-semibold">Pickup:</span>{" "}
                    {request.pickupLabel}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#0a1b3f]">
                    <span>
                      <span className="font-semibold">Party size:</span>{" "}
                      {request.partySize}
                    </span>
                    <span>
                      <span className="font-semibold">Cars needed:</span>{" "}
                      {request.carsNeeded}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleCancel(request.id)}
                      disabled={cancelingId === request.id}
                      className="rounded-full border border-[#b35656] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b35656] transition hover:bg-[#f7e9e7] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {cancelingId === request.id ? "Canceling..." : "Cancel ride"}
                    </button>
                    <Link
                      href="/dashboard"
                      className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b5f52]"
                    >
                      Back to dashboard
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
