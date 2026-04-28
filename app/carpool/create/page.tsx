"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PaymentsSupportMessage from "@/components/PaymentsSupportMessage";
import type { CarpoolType, TimeWindow } from "@/types/carpool";

const displayFont = { className: "font-heading" };

type FieldErrors = Partial<Record<"destination" | "date" | "timeStart" | "timeEnd" | "pickupArea" | "seatsNeeded", string>>;

export default function CreateCarpoolPage() {
  return (
    <Suspense fallback={<CreateCarpoolFallback />}>
      <CreateCarpoolPageContent />
    </Suspense>
  );
}

function CreateCarpoolFallback() {
  return (
    <main className="page-shell px-6 py-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="surface-card brand-accent-top rounded-[28px] p-5 text-sm text-muted">
          Loading account details...
        </div>
      </div>
    </main>
  );
}

function CreateCarpoolPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // When the rider arrives from the dashboard chooser, preserve the selected
  // role so the create form can render the matching state immediately.
  const requestedCarpoolType = searchParams.get("carpoolType");
  const [canChooseCarpoolType, setCanChooseCarpoolType] = useState(false);
  const [carpoolType, setCarpoolType] = useState<CarpoolType | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Suggested destinations (campus-defined places)
  const suggestedDestinations = useMemo(
    () => [
      "Boston Airport",
      "New York City",
      "Hartford",
      "Springfield",
      "Amherst",
      "Northampton"
    ],
    []
  );

  // Suggested pickup areas
  const suggestedPickups = useMemo(
    () => [
      "Smith College",
      "Northampton Post Office",
      "Amherst College",
      "Ziskind Dorm",
      "Smith's Seelye Hall",
      "Chase-Duckett House",
    ],
    []
  );

  // Form state
  const [destination, setDestination] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [timeStart, setTimeStart] = useState<string>("");
  const [timeEnd, setTimeEnd] = useState<string>("");
  const [pickupArea, setPickupArea] = useState<string>("");
  const [seatsNeeded, setSeatsNeeded] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

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
        
        // only signed in users should be able to create a carpool
        if (!res.ok) {
          throw new Error("Sign in to create a carpool.");
        }
        
        const data = await res.json().catch(() => null);
        if (ignore) return;
        
        // determines whether to give an option to choose requesting as a driver
        const isDriver = Boolean(data?.user?.isDriver);
        const initialCarpoolType =
          requestedCarpoolType === "DRIVER" || requestedCarpoolType === "RIDER"
            ? requestedCarpoolType
            : null;
        setCanChooseCarpoolType(isDriver);
        setCarpoolType(isDriver ? initialCarpoolType : "RIDER");
      } catch (error: unknown) {
        if (!ignore) {
          setCanChooseCarpoolType(false);
          setCarpoolType("RIDER");
          setSubmitError(error instanceof Error ? error.message : "Unable to load account details.");
        }
      } finally {
        if (!ignore) {
          setLoadingSession(false);
        }
      }
    }

    fetchSession();

    return () => {
      ignore = true;
    };
  }, [requestedCarpoolType]);

  // Validation helpers
  function validateTextLocation(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return "Required.";
    if (/^\d+$/.test(trimmed)) return "Please enter a real location (not only numbers).";
    if (trimmed.length < 3) return "Please be more specific (at least 3 characters).";
    return undefined;
  }

  function validateTimeWindow() {
    if (!timeStart || !timeEnd) {
      return "Both start and end times are required.";
    }
    if (timeStart >= timeEnd) {
      return "End time must be after start time.";
    }
    return undefined;
  }

  function validateForm(): boolean {
    const next: FieldErrors = {};

    const destErr = validateTextLocation(destination);
    if (destErr) next.destination = destErr;

    if (!date) {
      next.date = "Date is required.";
    } else {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        next.date = "Date cannot be in the past.";
      }
    }

    const timeErr = validateTimeWindow();
    if (timeErr) {
      next.timeStart = timeErr;
      next.timeEnd = timeErr;
    }

    const pickupErr = validateTextLocation(pickupArea);
    if (pickupErr) next.pickupArea = pickupErr;

    if (!Number.isFinite(seatsNeeded) || seatsNeeded < 1) {
      next.seatsNeeded = "Must need at least 1 seat.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    setSubmitError("");
    setSubmitSuccess(false);

    if (!carpoolType) {
      setSubmitError("Choose whether this carpool request is as a driver or rider.");
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const timeWindow: TimeWindow = {
        start: timeStart,
        end: timeEnd
      };

      const payload = {
        destination: destination.trim(),
        date,
        timeWindow,
        pickupArea: pickupArea.trim(),
        seatsNeeded,
        notes: notes.trim() || undefined,
        status: "OPEN",
        carpoolType,
      };

      const res = await fetch("/api/carpools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to create carpool");
      }

      const data = await res.json();
      setSubmitSuccess(true);

      // Redirect to the carpool thread page
      setTimeout(() => {
        router.push(`/carpool/${data.carpool.id}`);
      }, 1000);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <main className="page-shell px-6 py-12">
      <div className="mx-auto w-full max-w-xl">
        <header className="app-topbar brand-accent-top rounded-[30px] px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="eyebrow">Carpool</p>
              <h1 className={`${displayFont.className} mt-2 text-3xl font-semibold text-[var(--primary)]`}>
                Create Carpool
              </h1>
              <p className="text-muted mt-2 text-sm">
                Fill out the details to create a new carpool thread.
              </p>
            </div>
            <Link
              href="/dashboard?carpoolOptions=1"
              className="btn-secondary gap-2 px-4 py-2 text-sm font-semibold"
              aria-label="Back to carpool options"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back to options
            </Link>
          </div>
        </header>

      <div className="mt-8 grid gap-5">
        {loadingSession ? (
          <div className="surface-card brand-accent-top rounded-[28px] p-5 text-sm text-muted">
            Loading account details...
          </div>
        ) : null}

        {canChooseCarpoolType && !carpoolType ? (
          <div className="surface-card brand-accent-top rounded-[28px] p-6">
            <p className="eyebrow">Step 1</p>
            <h2 className={`${displayFont.className} text-2xl text-[var(--primary)]`}>
              Who are you requesting this carpool AS?
            </h2>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => setCarpoolType("DRIVER")}
                className="surface-panel group rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--primary)_6%,var(--background))]"
              >
                <span className="flex items-center justify-between text-sm font-semibold text-[var(--primary)]">
                  <span>Driver on the request</span>
                  <span className="btn-secondary px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] transition group-hover:bg-[var(--primary)] group-hover:text-white">
                    Select
                  </span>
                </span>
                <span className="text-muted mt-2 block text-sm">
                  I&apos;m a driver who wants to find riders to hop on my ride to XXX
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCarpoolType("RIDER")}
                className="surface-panel group rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--primary)_6%,var(--background))]"
              >
                <span className="flex items-center justify-between text-sm font-semibold text-[var(--primary)]">
                  <span>Rider on request</span>
                  <span className="btn-secondary px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] transition group-hover:bg-[var(--primary)] group-hover:text-white">
                    Select
                  </span>
                </span>
                <span className="text-muted mt-2 block text-sm">
                  I am a rider who wants to find other riders to carpool with
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {carpoolType ? (
          <div className="surface-card brand-accent-top rounded-[24px] p-4 text-sm">
            <span className="font-semibold">Carpool type:</span>{" "}
            {carpoolType === "DRIVER" ? "Driver on the request" : "Rider on request"}
            {canChooseCarpoolType ? (
              <button
                type="button"
                onClick={() => setCarpoolType(null)}
                className="btn-secondary ml-3 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
              >
                Change
              </button>
            ) : null}
          </div>
        ) : null}

        {carpoolType ? (
          <div className="surface-card brand-accent-top rounded-[28px] p-6">
        <p className="eyebrow">Step 2</p>
        <div className="mt-2">
          <h2 className={`${displayFont.className} text-2xl font-semibold text-[var(--primary)]`}>
            Trip details
          </h2>
          <p className="text-muted mt-2 text-sm">
            Add the destination, timing, pickup area, and seat details for this thread.
          </p>
        </div>
        <div className="mt-6 space-y-5">
        {/* Destination */}
        <div className="grid gap-1">
          <label className="text-sm font-medium">Destination</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Type a destination"
            className="app-input app-field-control"
          />
          {errors.destination ? (
            <p className="text-sm text-red-600">{errors.destination}</p>
          ) : null}
        </div>

        {/* Suggested destinations */}
        <div className="flex flex-wrap gap-2">
          {suggestedDestinations.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDestination(d)}
              className="btn-secondary px-3 py-1 text-sm font-medium"
            >
              {d}
            </button>
          ))}
        </div>

        {/* Date */}
        <div className="grid gap-1">
          <label className="text-sm font-medium">Date</label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="app-input app-field-control"
          />
          {errors.date ? (
            <p className="text-sm text-red-600">{errors.date}</p>
          ) : null}
        </div>

        {/* Time Window */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Time Window</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <label className="text-xs text-neutral-600">Start time</label>
              <input
                type="time"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className="app-input app-field-control"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-neutral-600">End time</label>
              <input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="app-input app-field-control"
              />
            </div>
          </div>
          {errors.timeStart || errors.timeEnd ? (
            <p className="text-sm text-red-600">
              {errors.timeStart || errors.timeEnd}
            </p>
          ) : (
            <p className="app-helper-text">
              Choose a time window (e.g., 4:30 PM - 5:30 PM)
            </p>
          )}
        </div>

        {/* Pickup Area */}
        <div className="grid gap-1">
          <label className="text-sm font-medium">Pickup Area</label>
          <input
            type="text"
            value={pickupArea}
            onChange={(e) => setPickupArea(e.target.value)}
            placeholder="Type a pickup location"
            className="app-input app-field-control"
          />
          {errors.pickupArea ? (
            <p className="text-sm text-red-600">{errors.pickupArea}</p>
          ) : null}
        </div>

        {/* Suggested pickup areas */}
        <div className="flex flex-wrap gap-2">
          {suggestedPickups.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPickupArea(p)}
              className="btn-secondary px-3 py-1 text-sm font-medium"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Seats Needed */}
        <div className="grid gap-1">
          <label className="text-sm font-medium">Seats Needed</label>
          <input
            type="number"
            min={1}
            max={10}
            value={seatsNeeded}
            onChange={(e) => setSeatsNeeded(Number(e.target.value))}
            className="app-input app-field-control"
          />
          {errors.seatsNeeded ? (
            <p className="text-sm text-red-600">{errors.seatsNeeded}</p>
          ) : (
            <p className="app-helper-text">
              How many additional riders do you need?
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="grid gap-1">
          <label className="text-sm font-medium">
            Notes <span className="text-neutral-500">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., luggage, quiet ride, etc."
            className="app-input app-field-control min-h-[84px]"
          />
        </div>

        {/* Submit button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="btn-primary px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Carpool"}
          </button>

          {submitSuccess ? (
            <span className="text-sm text-green-700">Carpool created! Redirecting...</span>
          ) : null}
        </div>

        {submitError ? (
          <PaymentsSupportMessage message={submitError} className="text-sm text-red-600" />
        ) : null}
        </div>
          </div>
        ) : null}
      </div>
      </div>
    </main>
  );
}
