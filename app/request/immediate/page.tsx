"use client"; // makes the page run in a browser. We need this because we use React state and handle user input


// useState = store values that change (form inputs, errors)
// useMemo = compute values once and reuse them unless dependencies change
import { useMemo, useState } from "react";
// import shared types so our request matches the backend contract
import type { RideRequest, RequestStatus, RequestType } from "@/types/request";

// This type defines which form fields can have errors and what shape they take
// Partial = not every field must have an error at the same time
type FieldErrors = Partial<Record<"partySize" | "pickup" | "dropoff", string>>;

/* ---------- Page component ---------- */

export default function ImmediateRequestPage() {
    // Suggested pickup locations shown as quick-fill buttons
    // For MVP. For v2, make more complex
    const suggestedPickups = useMemo(
    () => [
      "Campus Center",
      "Yolanda King House",
      "King/Scales House",
      "Ford Hall",
      "Seelye Hall",
      "Chase-Duckett House"
    ],
    []
  );



/* ---------- Helper validation functions ---------- */

// Check if a string is made of only numbers
function isAllDigits(s: string) {
  return /^\d+$/.test(s.trim());
}

// Check if a string is too short to be a real location
function isTooShort(s: string) {
  return s.trim().length < 3;
}

/* ---------- Validation Functions ---------- */

// Validates pickup/destination entries: not complex yet --> for just MVP
function validateTextLocation(label: string) {
  const trimmed = label.trim();
  // Empty input
  if (!trimmed) return "Required.";
  // Prevent inputs like "12345"
  if (isAllDigits(trimmed)) return "Please enter a real location (not only numbers).";
  // Prevent vague inputs like "ab"
  if (isTooShort(trimmed)) return "Please be more specific (at least 3 characters).";
  return undefined;
}

/* ----------- Very simple MVP estimate stubs (fake logic, replace later with real logic) -------- */

// Simple and rough estimate of how long the user might wait
// In future, modify to incorporate demand, time of day, number of drivers available, ...
function estimateWaitMinutes(partySize: number) {
  // Example heuristic: more riders -> slightly longer
  const base = 4;
  return Math.min(20, base + Math.max(0, partySize - 1) * 2);
}

// Simple and rough price range estimate
function estimatePriceRange(partySize: number) {
  // Example heuristic: base fare + per-rider add-on
  const base = 7;
  const perRider = 2;
  const min = base + (partySize - 1) * perRider;
  const max = min + 4;
  console.log("Price:", min, "-", max);
  return { min, max };
}

  /* ----- Form state ----- */

  // Number of riders
  const [partySize, setPartySize] = useState<number>(1);
  // Pickup location text
  const [pickup, setPickup] = useState<string>("");
  // Optional notes to help the driver find the rider
  const [pickupNotes, setPickupNotes] = useState<string>("");
  // Destination text
  const [dropoff, setDropoff] = useState<string>("");
  // Saves the validation errors
  const [errors, setErrors] = useState<FieldErrors>({});
  // Tracks submission lifecycle
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  // Recalculate estimates when party size changes
  const waitMins = useMemo(() => estimateWaitMinutes(partySize), [partySize]);
  const price = useMemo(() => estimatePriceRange(partySize), [partySize]);


  /* ---------- Form validation ---------- */

  function validateForm(): boolean {
    const next: FieldErrors = {};

    // Riders must be at least 1
    if (!Number.isFinite(partySize) || partySize < 1) {
      next.partySize = "Must be at least 1 rider.";
    }
    // Validate pickup text
    const pickupErr = validateTextLocation(pickup);
    if (pickupErr) next.pickup = pickupErr;
    // Validate destination text
    const dropoffErr = validateTextLocation(dropoff);
    if (dropoffErr) next.dropoff = dropoffErr;

    // Save errors so the UI can show them
    setErrors(next);
    // Form is valid only if there are no errors
    return Object.keys(next).length === 0;
  }

  /* ---------- Submit request ---------- */

  async function onSubmit() {
    // Clear old messages
    setSubmitError("");
    setSubmitSuccess(false);

    // if validation fails, stop
    if (!validateForm()) return;
    // else submit
    setSubmitting(true);


    try {
      const now = new Date();
      // Gets the pickup time (for now, set to 5m from time of request)
      const waitMinutes = estimateWaitMinutes(partySize)
      const pickupAt = new Date(now.getTime() + waitMinutes * 60 * 1000).toISOString(); // ASAP buffer
      const createdAt = now.toISOString();

      // MVP: placeholder riderId. Replace with real auth later.
      const riderId = "rider_placeholder";

      // Build the request sent to the backend
      const payload: Omit<RideRequest, "id"> = {
        riderId,
        type: "IMMEDIATE" as RequestType,
        status: "OPEN" as RequestStatus,
        pickup: { label: pickup.trim(), address: pickup.trim() },
        dropoff: { label: dropoff.trim(), address: dropoff.trim() },
        partySize,
        pickupAt, // required if you adopted pickupAt-required model
        createdAt,
      } as any; // take out as any when pickupNotes validation is more stable

      // Send the request to the serve to create a new ride request
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, pickupNotes: pickupNotes.trim() || undefined }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Request failed.");
      }

      // Request successfully created
      setSubmitSuccess(true);
      // Optional: redirect to accept flow after success
      // router.push("/accept"); // if/when you have it
    } catch (e: any) {
        // Show failure message
      setSubmitError(e?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- UI ---------- */

  return (
    <main className="p-6 max-w-xl">
       {/* Page title */}
      <h1 className="text-2xl font-semibold">Request now</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Fill this out to place an immediate ride request.
      </p>


      <div className="mt-6 grid gap-4">
        {/* Number of Riders */}
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
            {/* Pickup Location */}
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

          {/* Suggested pickup options */}
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

          {/* Pickup notes */}
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

        {/* Destination */}
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

        {/* Estimates */}
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-medium">Estimates (MVP)</div>
          <div className="mt-2 text-sm text-neutral-700">
            Estimated wait time: <span className="font-medium">{waitMins} min</span>
          </div>
          <div className="mt-1 text-sm text-neutral-700">
            Estimated price range:{" "}
            <span className="font-medium">
              ${price.min}–${price.max}
            </span>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-xl px-4 py-3 border bg-white hover:bg-neutral-50 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Confirm & Request"}
          </button>

        {/* Feedback messages */}
          {submitSuccess ? (
            <span className="text-sm text-green-700">Request sent.</span>
          ) : null}
        </div>

        {submitError ? (
          <p className="text-sm text-red-600">{submitError}</p>
        ) : null}
      </div>
    </main>
  );
}
