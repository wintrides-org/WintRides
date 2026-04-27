/**
 * Driver Upcoming Rides (MVP)
 *
 * Lists MATCHED rides for the signed-in driver.
 * Complete marks a ride as COMPLETED and shows a confetti confirmation.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Playfair_Display, Work_Sans } from "next/font/google";
import { estimatePriceRange } from "@/lib/requestValidation";

type RideRequestRow = {
  id: string;
  status: "OPEN" | "MATCHED" | "CANCELED" | "EXPIRED" | "DRAFT";
  type: "IMMEDIATE" | "SCHEDULED" | "GROUP";
  pickupLabel: string;
  dropoffLabel: string;
  pickupAt: string;
  partySize: number;
  carsNeeded: number;
  driverLocationSharingStartedAt?: string | null;
  driverLocationLastSharedAt?: string | null;
};

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function DriverUpcomingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const MIN_CANCEL_REASON_LENGTH = 15;
  const LOCATION_SEND_INTERVAL_MS = 10_000;
  // Driver/session info and upcoming rides state.
  const [driverId, setDriverId] = useState<string>("");
  const [requests, setRequests] = useState<RideRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completeNotice, setCompleteNotice] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelModalRequest, setCancelModalRequest] = useState<RideRequestRow | null>(null);
  const [gpsPromptRequest, setGpsPromptRequest] = useState<RideRequestRow | null>(null);
  const [sharingLocationId, setSharingLocationId] = useState<string | null>(null);
  const [activeLocationRideId, setActiveLocationRideId] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState("");
  const [locationError, setLocationError] = useState("");
  const [showLockSuccessModal, setShowLockSuccessModal] = useState(false);
  const locationWatchIdRef = useRef<number | null>(null);
  const lastLocationPostAtRef = useRef<number>(0);
  const lastLocationRequestIdRef = useRef<string | null>(null);
  const successRideId = searchParams.get("rideId");

  function clearDriverLocationWatch() {
    if (locationWatchIdRef.current !== null && typeof window !== "undefined") {
      window.navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
    setSharingLocationId(null);
    setActiveLocationRideId(null);
    lastLocationRequestIdRef.current = null;
  }

  useEffect(() => {
    let ignore = false;

    // Identify the signed-in driver so we can fetch their rides.
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
          setDriverId(data?.user?.id || "");
        }
      } catch {
        if (!ignore) {
          setDriverId("");
        }
      }
    }

    fetchSession();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => clearDriverLocationWatch, []);

  useEffect(() => {
    if (searchParams.get("lockSuccess") === "1") {
      setShowLockSuccessModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeLocationRideId) {
      return;
    }

    const activeRideStillVisible = requests.some(
      (request) => request.id === activeLocationRideId
    );

    // clears GPS notifications for a ride if the ride is no longer active
    if (!activeRideStillVisible) {
      clearDriverLocationWatch();
      setLocationNotice("");
      setLocationError("");
    }
  }, [activeLocationRideId, requests]);

  useEffect(() => {
    let ignore = false;

    // Load MATCHED rides for this driver.
    async function fetchUpcoming() {
      setError("");
      try {
        if (!driverId) return;
        const res = await fetch(`/api/requests?status=MATCHED&driverId=${driverId}`);
        if (!res.ok) {
          throw new Error("Failed to load upcoming rides.");
        }
        const data = await res.json();
        if (!ignore) {
          setRequests(data.requests || []);
        }
      } catch (err) {
        if (!ignore) {
          const message =
            err instanceof Error ? err.message : "Failed to load upcoming rides.";
          setError(message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    // Only fetch once a driver ID is known.
    if (driverId) {
      fetchUpcoming();
    }

    return () => {
      ignore = true;
    };
  }, [driverId]);

  // Add display-friendly fields (formatted time and pay estimate).
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
        pay: estimatePriceRange(request.partySize).min,
      })),
    [requests]
  );

  /* function to clear out LOCK success modal  */
  function dismissLockSuccessModal() {
    setShowLockSuccessModal(false);
    if (searchParams.get("lockSuccess") !== "1") {
      return;
    }
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("lockSuccess");
    nextParams.delete("rideId");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `/driver/upcoming?${nextQuery}` : "/driver/upcoming");
  }

  // Mark a ride as completed and show a confirmation.
  async function handleComplete(requestId: string, pay: number) {
    setCompleteNotice("");
    setCompletingId(requestId);

    try {
      if (!driverId) {
        throw new Error("Unable to confirm driver. Please sign in again.");
      }
      const res = await fetch("/api/requests/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, driverId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to complete ride.");
      }
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      setCompleteNotice(`You earned $${pay} for this trip!`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to complete ride.";
      setCompleteNotice(message);
    } finally {
      setCompletingId(null);
    }
  }

  // Cancels a ride for the driver and informs the rider
  async function handleDriverCancel() {
    if (!cancelModalRequest) return;

    setCancelNotice("");
    setCancelingId(cancelModalRequest.id);

    try {
      // authenticates the users' signin to enusr ethey are valid users (and drivers)
      if (!driverId) {
        throw new Error("Unable to confirm driver. Please sign in again.");
      }
      const sessionToken = localStorage.getItem("sessionToken");
      const res = await fetch("/api/requests/driver-cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          requestId: cancelModalRequest.id,
          reason: cancelReason,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to cancel ride.");
      }

      setRequests((prev) => prev.filter((req) => req.id !== cancelModalRequest.id));
      setCancelNotice("Ride canceled and sent back to Ride Requests.");
      setCancelReason("");
      setCancelModalRequest(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel ride.";
      setCancelNotice(message);
    } finally {
      setCancelingId(null);
    }
  }

  // function to get the driver's location
  async function postDriverLocation(requestId: string, position: GeolocationPosition) {
    const now = Date.now();
    const isSameRideAsLastPost = lastLocationRequestIdRef.current === requestId;
    if (isSameRideAsLastPost && now - lastLocationPostAtRef.current < LOCATION_SEND_INTERVAL_MS) {
      return;
    }

    // fetch the location of the driver using api/requests/driver-location
    const sessionToken = localStorage.getItem("sessionToken");
    const res = await fetch("/api/requests/driver-location", { 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      body: JSON.stringify({
        requestId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy, // margin of error
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.error || "Failed to share location.");
    }
    // update timestamp if location posting was successful
    lastLocationPostAtRef.current = now;
    lastLocationRequestIdRef.current = requestId;

    // updates ride request with driverLocation sharing status
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              driverLocationSharingStartedAt:
                request.driverLocationSharingStartedAt || new Date().toISOString(),
              driverLocationLastSharedAt: new Date().toISOString(),
            }
          : request
      )
    );
  }

  // handles tracking of driver's location from browser
  function handleStartDriverGps(request: RideRequestRow) {
    setLocationError("");
    setLocationNotice("");

    // checks .navigator property for geolocation feature
    if (!("geolocation" in navigator)) {
      setLocationError("This browser does not support device geolocation.");
      setGpsPromptRequest(null);
      return;
    }

    clearDriverLocationWatch();
    setSharingLocationId(request.id);
    setActiveLocationRideId(request.id);
    setGpsPromptRequest(null);

    // gets the position (from postDriverLocation()) of the driver and stores in watchId 
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          await postDriverLocation(request.id, position);
          setLocationNotice("Driver GPS sharing is live for this trip.");
          setLocationError("");
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to share location.";
          setLocationError(message);
        }
      },
      (geoError) => {
        setLocationError(geoError.message || "Unable to access your location.");
        clearDriverLocationWatch();
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    locationWatchIdRef.current = watchId;
  }

  return (
    <main
      className={`page-shell px-6 py-10 ${bodyFont.className}`}
    >
      <div className="mx-auto w-full max-w-5xl">
        {/* Page header with back button, title, and upcoming count. */}
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/driver/dashboard"
            className="icon-button h-12 w-12"
            aria-label="Back to driver dashboard"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div>
            <h1 className={`${displayFont.className} text-3xl text-[var(--primary)]`}>
              Upcoming Rides
            </h1>
            <p className="text-muted mt-1 text-sm">
              Accepted rides waiting for pickup.
            </p>
          </div>
          <span className="btn-secondary px-4 py-2 text-xs font-semibold">
            {requests.length} upcoming
          </span>
        </header>

        {/* Upcoming list with completion modal + loading/error/empty states. */}
        <section className="mt-8 space-y-4">
          {cancelModalRequest ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
              <div className="surface-card w-full max-w-2xl rounded-3xl p-6">
                <h2 className={`${displayFont.className} text-2xl text-[var(--primary)]`}>
                  Are you sure you want to cancel?
                </h2>
                <p className="text-muted mt-3 text-sm">
                  Canceling will reflect on your profile. We discourage canceling on riders but we understand that things happen.
                </p>
                <label className="mt-5 block text-sm font-semibold text-[var(--primary)]">
                  Cancellation reason
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={5}
                  className="app-input mt-2 w-full rounded-2xl p-4 text-sm"
                  placeholder="Explain why you need to cancel this ride."
                />
                {cancelReason.length > 0 && cancelReason.trim().length < MIN_CANCEL_REASON_LENGTH ? (
                  <p className="mt-2 text-sm text-[#b42318]">
                    Reason for cancelation is unclear/too short
                  </p>
                ) : null}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelModalRequest(null);
                      setCancelReason("");
                    }}
                    className="btn-secondary px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={handleDriverCancel}
                    disabled={
                      cancelingId === cancelModalRequest.id ||
                      cancelReason.trim().length < MIN_CANCEL_REASON_LENGTH
                    }
                    className="btn-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancelingId === cancelModalRequest.id ? "Canceling..." : "Cancel Ride"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {gpsPromptRequest ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
              <div className="surface-card w-full max-w-2xl rounded-3xl p-6">
                <h2 className={`${displayFont.className} text-2xl text-[var(--primary)]`}>
                  Turn on driver GPS sharing?
                </h2>
                <p className="text-muted mt-3 text-sm">
                  Your GPS location is shared with WintRides. Driver location is
                  required on every trip for rider safety.
                </p>
                <p className="text-muted mt-3 text-sm">
                  Sharing starts only for this matched ride and updates while this
                  page remains open.
                </p>
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setGpsPromptRequest(null)}
                    className="btn-secondary px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                  >
                    Not Now
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartDriverGps(gpsPromptRequest)}
                    className="btn-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                  >
                    Share My Location
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Success Modal after LOCK (and associated after effects) completed for driver */}
          {showLockSuccessModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
              <div className="surface-card w-full max-w-2xl rounded-3xl p-6">
                <h2 className={`${displayFont.className} text-2xl text-[var(--primary)]`}>
                  Ride created successfully
                </h2>
                <p className="text-muted mt-3 text-sm">
                  The ride has been created and entered into the flow. Monitor the status on your driver dashboard.
                </p>
                <p className="text-muted mt-2 text-sm">
                  Riders on the carpool can also monitor the status of the ride from their dashboard.
                </p>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    /* clicking clears out the modal */
                    onClick={dismissLockSuccessModal}
                    className="btn-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {cancelNotice ? (
            <div className="surface-card rounded-2xl p-4 text-center">
              <p className="text-sm text-[var(--primary)]">{cancelNotice}</p>
            </div>
          ) : null}
          {locationNotice ? (
            <div className="surface-card rounded-2xl p-4 text-center">
              <p className="text-sm text-[var(--primary)]">{locationNotice}</p>
            </div>
          ) : null}
          {locationError ? (
            <div className="rounded-2xl border border-[#b42318] bg-[#fff5f4] p-4 text-center">
              <p className="text-sm text-[#b42318]">{locationError}</p>
            </div>
          ) : null}
          {completeNotice ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
              <div className="surface-card relative w-full max-w-sm overflow-hidden rounded-3xl p-6 text-center">
                <div className="pointer-events-none absolute inset-0">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <span
                      key={`complete-confetti-${index}`}
                      className="absolute h-3 w-2 rounded-sm bg-[#800080]"
                      style={{
                        left: `${10 + index * 8}%`,
                        top: "-12%",
                        animationDelay: `${index * 0.1}s`,
                        animationDuration: "2s",
                      }}
                    />
                  ))}
                </div>
                <p className={`${displayFont.className} text-xl text-[var(--primary)]`}>
                  {completeNotice}
                </p>
                <button
                  type="button"
                  onClick={() => setCompleteNotice("")}
                  className="btn-secondary mt-4 px-4 py-1 text-xs font-semibold"
                  aria-label="Dismiss confirmation"
                >
                  ✕
                </button>
                <style jsx>{`
                  span {
                    animation-name: confetti-fall;
                    animation-timing-function: ease-in;
                    animation-iteration-count: 1;
                    animation-fill-mode: forwards;
                  }
                  @keyframes confetti-fall {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(220px) rotate(220deg);
                      opacity: 0;
                    }
                  }
                  @media (prefers-reduced-motion: reduce) {
                    span {
                      animation: none;
                    }
                  }
                `}</style>
              </div>
            </div>
          ) : null}
          {loading && (
            <div className="surface-card rounded-2xl p-6 text-center text-sm text-muted">
              Loading upcoming rides...
            </div>
          )}

          {!loading && error && (
            <div className="surface-card rounded-2xl p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && formatted.length === 0 && (
            <div className="surface-card rounded-2xl p-6 text-center text-sm text-muted">
              No upcoming rides yet.
            </div>
          )}

          {!loading && !error && formatted.length > 0 && (
            <div className="space-y-4">
              {formatted.map((request) => (
                <div
                  key={request.id}
                  className={`rounded-2xl p-5 ${
                    successRideId === request.id
                      ? "border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
                      : "surface-card"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--primary)]">
                        {request.dropoffLabel}
                      </h2>
                      <p className="text-muted mt-1 text-sm">
                        {request.pickupTime}
                      </p>
                    </div>
                    <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,var(--background))] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                      UPCOMING
                    </span>
                  </div>
                  <div className="mt-3 text-sm">
                    <span className="font-semibold">Pickup:</span> {request.pickupLabel}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                    <span>
                      <span className="font-semibold">Party size:</span> {request.partySize}
                    </span>
                    <span>
                      <span className="font-semibold">Cars needed:</span> {request.carsNeeded}
                    </span>
                    <span>
                      <span className="font-semibold">Pay:</span> ${request.pay}
                    </span>
                  </div>
                  <div className="surface-panel mt-3 rounded-2xl p-3 text-sm text-muted">
                    <p className="font-semibold text-[var(--primary)]">Driver GPS</p>
                    <p className="mt-1">
                      {activeLocationRideId === request.id
                        ? "Sharing live location now."
                        : request.driverLocationLastSharedAt
                          ? `Last shared ${new Date(
                              request.driverLocationLastSharedAt
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}.`
                          : "Location sharing has not started for this trip."}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLocationError("");
                        setLocationNotice("");
                        setGpsPromptRequest(request);
                      }}
                      disabled={sharingLocationId === request.id}
                      className="btn-primary px-4 py-1 text-xs font-semibold disabled:opacity-60"
                    >
                      {activeLocationRideId === request.id
                        ? "GPS Sharing Active"
                        : sharingLocationId === request.id
                          ? "Starting GPS..."
                          : "Enable GPS"}
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        request.pickupLabel
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary px-4 py-1 text-xs font-semibold"
                    >
                      Navigate
                    </a>
                    <button
                      type="button"
                      onClick={() => handleComplete(request.id, request.pay)}
                      disabled={completingId === request.id}
                      className="btn-secondary px-4 py-1 text-xs font-semibold disabled:opacity-60"
                    >
                      {completingId === request.id ? "Completing..." : "Complete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCancelNotice("");
                        setCancelReason("");
                        setCancelModalRequest(request);
                      }}
                      className="rounded-full border border-[#b42318] bg-white px-4 py-1 text-xs font-semibold text-[#b42318] hover:bg-[#f8e0de]"
                    >
                      Cancel Ride
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
