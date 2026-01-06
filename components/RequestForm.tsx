"use client";

import { useMemo, useState } from "react";
import type { RideRequest, RequestStatus, RequestType } from "@/types/request";

type FieldErrors = Partial<
  Record<"partySize" | "pickup" | "dropoff" | "pickupAt" | "carsNeeded", string>
>;

// Props control which fields appear for each request flow.
type RequestFormProps = {
  requestType: RequestType;
  title: string;
  description: string;
  showPickupAt?: boolean;
  showCarsNeeded?: boolean;
};

// Draft payload used for the quote step before final submission.
type QuoteDraft = Omit<RideRequest, "id">;

// Basic input sanity checks for MVP validation.
function isAllDigits(s: string) {
  return /^\d+$/.test(s.trim());
}

function isTooShort(s: string) {
  return s.trim().length < 3;
}

// Shared text field validator for pickup/dropoff.
function validateTextLocation(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return "Required.";
  if (isAllDigits(trimmed)) return "Please enter a real location (not only numbers).";
  if (isTooShort(trimmed)) return "Please be more specific (at least 3 characters).";
  return undefined;
}

// MVP stub estimates; replace with backend pricing/ETA later.
function estimateWaitMinutes(partySize: number) {
  const base = 4;
  return Math.min(20, base + Math.max(0, partySize - 1) * 2);
}

function estimatePriceRange(partySize: number) {
  const base = 7;
  const perRider = 2;
  const min = base + (partySize - 1) * perRider;
  const max = min + 4;
  return { min, max };
}

// Shared form component used by Immediate, Scheduled, and Group request pages.
export default function RequestForm({
  requestType,
  title,
  description,
  showPickupAt = false,
  showCarsNeeded = false,
}: RequestFormProps) {
  // Suggested pickup chips for fast entry.
  const suggestedPickups = useMemo(
    () => [
      "Campus Center",
      "Yolanda King House",
      "King/Scales House",
      "Ford Hall",
      "Seelye Hall",
      "Chase-Duckett House",
    ],
    []
  );

  // Form inputs.
  const [partySize, setPartySize] = useState<number>(1);
  const [pickup, setPickup] = useState<string>("");
  const [pickupNotes, setPickupNotes] = useState<string>("");
  const [dropoff, setDropoff] = useState<string>("");
  const [pickupAtInput, setPickupAtInput] = useState<string>("");
  const [carsNeeded, setCarsNeeded] = useState<number>(1);
  // UX state (errors and submission feedback).
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  // Quote step state (modal + payload preview).
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft | null>(null);

  // Derived estimates update when party size changes.
  const waitMins = useMemo(() => estimateWaitMinutes(partySize), [partySize]);
  const price = useMemo(() => estimatePriceRange(partySize), [partySize]);

  // Scheduled/group pickup time validation.
  function validatePickupAt(input: string) {
    if (!input.trim()) return "Required.";
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return "Please choose a valid time.";
    if (parsed.getTime() <= Date.now()) return "Pickup time must be in the future.";
    return undefined;
  }

  // Full form validation based on the active flow.
  function validateForm(): boolean {
    const next: FieldErrors = {};

    if (!Number.isFinite(partySize) || partySize < 1) {
      next.partySize = "Must be at least 1 rider.";
    }

    const pickupErr = validateTextLocation(pickup);
    if (pickupErr) next.pickup = pickupErr;

    const dropoffErr = validateTextLocation(dropoff);
    if (dropoffErr) next.dropoff = dropoffErr;

    // Scheduled/group require a future pickup time.
    if (showPickupAt) {
      const pickupAtErr = validatePickupAt(pickupAtInput);
      if (pickupAtErr) next.pickupAt = pickupAtErr;
    }

    // Group requests require carsNeeded; other flows default to 1.
    if (showCarsNeeded) {
      if (!Number.isFinite(carsNeeded) || carsNeeded < 1) {
        next.carsNeeded = "Must be at least 1 car.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Build the shared request payload for quote/submit.
  function buildPayload(): QuoteDraft {
    const now = new Date();
    const waitMinutes = estimateWaitMinutes(partySize);
    // Immediate requests infer pickupAt from now; scheduled/group use user input.
    const pickupAt = showPickupAt
      ? new Date(pickupAtInput).toISOString()
      : new Date(now.getTime() + waitMinutes * 60 * 1000).toISOString();
    const createdAt = now.toISOString();
    const riderId = "rider_placeholder";

    // Keep the payload shape consistent across all flows.
    return {
      riderId,
      type: requestType,
      status: "OPEN" as RequestStatus,
      pickup: { label: pickup.trim(), address: pickup.trim() },
      dropoff: { label: dropoff.trim(), address: dropoff.trim() },
      pickupNotes: pickupNotes.trim() || undefined,
      partySize,
      pickupAt,
      carsNeeded: showCarsNeeded ? carsNeeded : 1,
      createdAt,
    };
  }

  // Step 1: validate and open the quote modal.
  function onSubmit() {
    setSubmitError("");
    setSubmitSuccess(false);

    if (!validateForm()) return;
    const payload = buildPayload();
    setQuoteDraft(payload);
    setQuoteOpen(true);
  }

  // Step 2: confirm quote and create the request in the backend.
  async function onConfirmQuote() {
    if (!quoteDraft) return;
    setSubmitting(true);

    try {
      // Replace with a dedicated "quote confirm" API when available.
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteDraft),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Request failed.");
      }

      setSubmitSuccess(true);
      setQuoteOpen(false);
      setQuoteDraft(null);
    } catch (e: any) {
      setSubmitError(e?.message || "Something went wrong.");
      setQuoteOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  // Close quote modal without losing form inputs.
  function onEditQuote() {
    setQuoteOpen(false);
  }

  // Abandon the request from the quote step.
  function onCancelQuote() {
    setQuoteOpen(false);
    setQuoteDraft(null);
  }

  return (
    <main className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-neutral-600">{description}</p>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-1">
          <label className="text-sm font-medium">Number of riders</label>
          <input
            type="number"
            min={1}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className="rounded-xl border p-3"
          />
          {errors.partySize ? (
            <p className="text-sm text-red-600">{errors.partySize}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Pick-up location</label>
            <input
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="Type a location (e.g., Campus Center)"
              className="rounded-xl border p-3"
            />
            {errors.pickup ? (
              <p className="text-sm text-red-600">{errors.pickup}</p>
            ) : (
              <p className="text-xs text-neutral-500">
                Be specific so your driver can find you.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestedPickups.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPickup(p)}
                className="rounded-full border px-3 py-1 text-sm hover:bg-neutral-50"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">
              Pick-up notes <span className="text-neutral-500">(optional)</span>
            </label>
            <textarea
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
              placeholder="e.g., back entrance near the road"
              className="rounded-xl border p-3 min-h-[84px]"
            />
          </div>
        </div>

        {showPickupAt ? (
          <div className="grid gap-1">
            <label className="text-sm font-medium">Pick-up time</label>
            <input
              type="datetime-local"
              value={pickupAtInput}
              onChange={(e) => setPickupAtInput(e.target.value)}
              className="rounded-xl border p-3"
            />
            {errors.pickupAt ? (
              <p className="text-sm text-red-600">{errors.pickupAt}</p>
            ) : null}
          </div>
        ) : null}

        {showCarsNeeded ? (
          <div className="grid gap-1">
            <label className="text-sm font-medium">Cars needed</label>
            <input
              type="number"
              min={1}
              value={carsNeeded}
              onChange={(e) => setCarsNeeded(Number(e.target.value))}
              className="rounded-xl border p-3"
            />
            {errors.carsNeeded ? (
              <p className="text-sm text-red-600">{errors.carsNeeded}</p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-1">
          <label className="text-sm font-medium">Destination</label>
          <input
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            placeholder="Type your destination"
            className="rounded-xl border p-3"
          />
          {errors.dropoff ? (
            <p className="text-sm text-red-600">{errors.dropoff}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-xl px-4 py-3 border bg-white hover:bg-neutral-50 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Confirm & Request"}
          </button>

          {submitSuccess ? (
            <span className="text-sm text-green-700">Request sent.</span>
          ) : null}
        </div>

        <p className="mt-2 text-xs text-neutral-500">You’ll review a quote before confirming.
</p>


        {submitError ? (
          <p className="text-sm text-red-600">{submitError}</p>
        ) : null}
      </div>

      {quoteOpen && quoteDraft ? (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm quote"
        >
          {/* Backdrop closes the modal without clearing inputs. */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={onEditQuote}
            aria-label="Close quote"
          />

          <div className="absolute left-1/2 top-1/2 w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Review your quote</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Confirm to place your request, or edit details.
                </p>
              </div>
              {/* Explicit close control for accessibility and clarity. */}
              <button
                type="button"
                onClick={onEditQuote}
                className="rounded-lg px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Request summary pulled from the drafted payload. */}
            <div className="mt-4 grid gap-3 text-sm text-neutral-700">
              <div>
                <span className="font-medium">Pickup:</span> {quoteDraft.pickup.label}
              </div>
              <div>
                <span className="font-medium">Destination:</span> {quoteDraft.dropoff.label}
              </div>
              <div>
                <span className="font-medium">Riders:</span> {quoteDraft.partySize}
              </div>
              {showPickupAt ? (
                <div>
                  <span className="font-medium">Pickup time:</span>{" "}
                  {new Date(quoteDraft.pickupAt).toLocaleString([], {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              ) : (
                <div>
                  <span className="font-medium">Pickup time:</span>{" "}
                  {new Date(quoteDraft.pickupAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
              {showCarsNeeded ? (
                <div>
                  <span className="font-medium">Cars needed:</span>{" "}
                  {quoteDraft.carsNeeded}
                </div>
              ) : null}
              {quoteDraft.pickupNotes ? (
                <div>
                  <span className="font-medium">Pickup notes:</span>{" "}
                  {quoteDraft.pickupNotes}
                </div>
              ) : null}
            </div>

            {/* Quote estimates shown only in the modal. */}
            <div className="mt-4 rounded-2xl border p-4">
              <div className="text-sm font-medium">Estimates (MVP)</div>
              <div className="mt-2 text-sm text-neutral-700">
                Estimated wait time:{" "}
                <span className="font-medium">{waitMins} min</span>
              </div>
              <div className="mt-1 text-sm text-neutral-700">
                Estimated price range:{" "}
                <span className="font-medium">
                  ${price.min}–${price.max}
                </span>
              </div>
            </div>

            {/* Confirm/Edit/Cancel control the quote step lifecycle. */}
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onEditQuote}
                className="rounded-xl px-4 py-2 text-sm border border-neutral-200 hover:bg-neutral-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onCancelQuote}
                className="rounded-xl px-4 py-2 text-sm border border-neutral-200 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmQuote}
                disabled={submitting}
                className="rounded-xl px-4 py-2 text-sm border bg-white hover:bg-neutral-50 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Confirm request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
