"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Playfair_Display, Work_Sans } from "next/font/google";
import PaymentsSupportMessage from "@/components/PaymentsSupportMessage";
import type { CarpoolType, TimeWindow } from "@/types/carpool";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

type FieldErrors = Partial<Record<"destination" | "date" | "timeStart" | "timeEnd" | "pickupArea" | "seatsNeeded", string>>;

export default function CreateCarpoolPage() {
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
    <main
      className={`min-h-screen bg-[#f4ecdf] px-6 py-12 text-[#1e3a5f] ${bodyFont.className}`}
    >
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/dashboard?carpoolOptions=1"
          className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
          aria-label="Back to carpool options"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className={`${displayFont.className} mt-6 text-3xl font-semibold text-[#0a3570]`}>
          Create Carpool
        </h1>
        <p className="mt-1 text-sm text-[#6b5f52]">
          Fill out the details to create a new carpool thread.
        </p>

      <div className="mt-6 grid gap-4">
        {loadingSession ? (
          <div className="rounded-2xl border border-[#1e3a5f] bg-[#f7efe7] p-4 text-sm text-[#6b5f52]">
            Loading account details...
          </div>
        ) : null}

        {canChooseCarpoolType && !carpoolType ? (
          <div className="rounded-3xl border-2 border-[#0a3570] bg-[#fdf7ef] p-5 shadow-[0_12px_26px_rgba(10,27,63,0.12)]">
            <h2 className={`${displayFont.className} text-2xl text-[#0a3570]`}>
              Who are you requesting this carpool AS?
            </h2>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => setCarpoolType("DRIVER")}
                className="group rounded-2xl border-2 border-[#0a3570] bg-white p-4 text-left shadow-[0_10px_24px_rgba(10,27,63,0.1)] transition hover:-translate-y-0.5 hover:bg-[#efe3d2] hover:shadow-[0_16px_32px_rgba(10,27,63,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a3570] focus-visible:ring-offset-2"
              >
                <span className="flex items-center justify-between text-sm font-semibold text-[#0a3570]">
                  <span>Driver on the request</span>
                  <span className="rounded-full border border-[#0a3570] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] transition group-hover:bg-[#0a3570] group-hover:text-white">
                    Select
                  </span>
                </span>
                <span className="mt-2 block text-sm text-[#6b5f52]">
                  I&apos;m a driver who wants to find riders to hop on my ride to XXX
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCarpoolType("RIDER")}
                className="group rounded-2xl border-2 border-[#0a3570] bg-white p-4 text-left shadow-[0_10px_24px_rgba(10,27,63,0.1)] transition hover:-translate-y-0.5 hover:bg-[#efe3d2] hover:shadow-[0_16px_32px_rgba(10,27,63,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a3570] focus-visible:ring-offset-2"
              >
                <span className="flex items-center justify-between text-sm font-semibold text-[#0a3570]">
                  <span>Rider on request</span>
                  <span className="rounded-full border border-[#0a3570] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] transition group-hover:bg-[#0a3570] group-hover:text-white">
                    Select
                  </span>
                </span>
                <span className="mt-2 block text-sm text-[#6b5f52]">
                  I am a rider who wants to find other riders to carpool with
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {carpoolType ? (
          <div className="rounded-2xl border border-[#1e3a5f] bg-[#f7efe7] p-3 text-sm text-[#1e3a5f]">
            <span className="font-semibold">Carpool type:</span>{" "}
            {carpoolType === "DRIVER" ? "Driver on the request" : "Rider on request"}
            {canChooseCarpoolType ? (
              <button
                type="button"
                onClick={() => setCarpoolType(null)}
                className="ml-3 rounded-full border border-[#0a3570] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a3570] transition hover:bg-[#0a3570] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a3570] focus-visible:ring-offset-2"
              >
                Change
              </button>
            ) : null}
          </div>
        ) : null}

        {carpoolType ? (
          <>
        {/* Destination */}
        <div className="grid gap-1">
          <label className="text-sm font-medium">Destination</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Type a destination"
            className="rounded-xl border border-[#1e3a5f] bg-[#f7efe7] p-3 text-[#1e3a5f] placeholder:text-[#7b6b5b] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
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
              className="rounded-full border border-[#1e3a5f] bg-[#e7c59a] px-3 py-1 text-sm font-medium text-[#1e3a5f] shadow-[0_6px_12px_rgba(10,27,63,0.08)] transition hover:bg-[#ddb680]"
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
            className="rounded-xl border border-[#1e3a5f] bg-[#f7efe7] p-3 text-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
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
                className="rounded-xl border border-[#1e3a5f] bg-[#f7efe7] p-3 text-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-neutral-600">End time</label>
              <input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="rounded-xl border border-[#1e3a5f] bg-[#f7efe7] p-3 text-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
              />
            </div>
          </div>
          {errors.timeStart || errors.timeEnd ? (
            <p className="text-sm text-red-600">
              {errors.timeStart || errors.timeEnd}
            </p>
          ) : (
            <p className="text-xs text-neutral-500">
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
            className="rounded-xl border border-[#1e3a5f] bg-[#f7efe7] p-3 text-[#1e3a5f] placeholder:text-[#7b6b5b] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
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
              className="rounded-full border border-[#1e3a5f] bg-[#e7c59a] px-3 py-1 text-sm font-medium text-[#1e3a5f] shadow-[0_6px_12px_rgba(10,27,63,0.08)] transition hover:bg-[#ddb680]"
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
            className="rounded-xl border border-[#1e3a5f] bg-[#f7efe7] p-3 text-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
          />
          {errors.seatsNeeded ? (
            <p className="text-sm text-red-600">{errors.seatsNeeded}</p>
          ) : (
            <p className="text-xs text-neutral-500">
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
            className="min-h-[84px] rounded-xl border border-[#1e3a5f] bg-[#f7efe7] p-3 text-[#1e3a5f] placeholder:text-[#7b6b5b] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
          />
        </div>

        {/* Submit button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-full bg-[#0a3570] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(10,27,63,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0a2d5c] disabled:opacity-50"
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
          </>
        ) : null}
      </div>
      </div>
    </main>
  );
}
