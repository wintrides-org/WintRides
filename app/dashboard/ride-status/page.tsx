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
  const [cancelModalRequest, setCancelModalRequest] = useState<
    Pick<RideRequestRow, "id" | "status"> | null
  >(null);

  useEffect(() => {
    let ignore = false;

    async function fetchSession() {
      try {
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch("/api/auth/session", {
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) {
          setRiderId(data?.user?.id || "");
        }
      } catch {
        if (!ignore) setRiderId("");
      }
    }

    fetchSession();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function fetchStatus() {
      setError("");
      try {
        if (!riderId) return;
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch(
          `/api/requests?status=OPEN,MATCHED&participantId=${riderId}`,
          {
            headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
          }
        );
        if (!res.ok) throw new Error("Failed to load ride status.");
        const data = await res.json();
        if (!ignore) setRequests(data.requests || []);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load ride status.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (riderId) fetchStatus();
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

  function handleCancelClick(request: Pick<RideRequestRow, "id" | "status">) {
    setCancelError("");
    setCancelModalRequest(request);
  }

  async function handleCancelConfirm() {
    if (!cancelModalRequest) return;

    setCancelingId(cancelModalRequest.id);
    try {
      const sessionToken = localStorage.getItem("sessionToken");
      const res = await fetch("/api/requests/rider-cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ requestId: cancelModalRequest.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to cancel ride.");
      setRequests((prev) => prev.filter((req) => req.id !== cancelModalRequest.id));
      setCancelModalRequest(null);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel ride.");
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {cancelModalRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="surface-card w-full max-w-xl rounded-3xl p-6">
            <h2 className="font-heading text-2xl text-[var(--primary)]">
              Are you sure you want to cancel?
            </h2>
            {cancelModalRequest.status === "MATCHED" ? (
              <p className="text-muted mt-3 text-sm">
                You&apos;ll be charged 50% of the transaction.
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalRequest(null)}
                className="btn-secondary px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={cancelingId === cancelModalRequest.id}
                className="btn-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cancelingId === cancelModalRequest.id ? "Canceling..." : "Cancel Ride"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header>
        <p className="eyebrow">Rider</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-3xl">Ride Status</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
          >
            Back
          </button>
        </div>
        <p className="text-muted mt-2 text-sm">
          Track upcoming rides and manage active requests.
        </p>
      </header>

      <div className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Upcoming requests</p>
          <p className="text-muted mt-1 text-xs">OPEN and MATCHED rides.</p>
        </div>
        <span className="btn-secondary px-4 py-2 text-xs font-semibold">{requests.length} active</span>
      </div>

      <section className="space-y-4">
        {loading && (
          <div className="surface-panel text-muted rounded-2xl border-dashed p-6 text-center text-sm">
            Loading ride status...
          </div>
        )}

        {!loading && error && (
          <div className="surface-panel rounded-2xl p-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && formatted.length === 0 && (
          <div className="surface-panel text-muted rounded-2xl p-6 text-center text-sm">
            No upcoming rides yet.
          </div>
        )}

        {!loading && !error && cancelError && (
          <div className="surface-panel rounded-2xl p-4 text-center">
            <p className="text-sm text-red-600">{cancelError}</p>
          </div>
        )}

        {!loading && !error && formatted.length > 0 && (
          <div className="space-y-4">
            {formatted.map((request) => {
              const statusMeta =
                STATUS_COPY[request.status as "OPEN" | "MATCHED"] || STATUS_COPY.OPEN;
              return (
                <div key={request.id} className="surface-card rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--primary)]">
                        {request.dropoffLabel}
                      </h2>
                      <p className="text-muted mt-1 text-sm">{request.pickupTime}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="mt-4 text-sm">
                    <span className="font-semibold">Pickup:</span> {request.pickupLabel}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    <span>
                      <span className="font-semibold">Party size:</span> {request.partySize}
                    </span>
                    <span>
                      <span className="font-semibold">Cars needed:</span> {request.carsNeeded}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleCancelClick(request)}
                      disabled={cancelingId === request.id}
                      className="rounded-full border border-[#b35656] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b35656] transition hover:bg-[#f7e9e7] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {cancelingId === request.id ? "Canceling..." : "Cancel ride"}
                    </button>
                    <Link
                      href="/dashboard"
                      className="text-muted text-xs font-semibold uppercase tracking-[0.18em]"
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
