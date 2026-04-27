"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PaymentsSupportMessage from "@/components/PaymentsSupportMessage";
import BrandMark from "@/components/BrandMark";
import type { RequestType } from "@/types/request";
import type {
  NormalizedRequest,
  QuoteEstimates,
  QuoteInput,
} from "@/lib/requestValidation";

type FieldErrors = Partial<
  Record<"partySize" | "pickup" | "dropoff" | "pickupAt" | "carsNeeded", string>
>;

type RequestFormProps = {
  requestType: RequestType;
  title: string;
  description: string;
  showPickupAt?: boolean;
  showCarsNeeded?: boolean;
  initialValues?: {
    partySize?: number;
    pickup?: string;
    pickupNotes?: string;
    dropoff?: string;
    pickupAtInput?: string;
    carsNeeded?: number;
    sourceCarpoolId?: string;
  };
};

type QuoteDraft = NormalizedRequest;

function isAllDigits(s: string) {
  return /^\d+$/.test(s.trim());
}

function isTooShort(s: string) {
  return s.trim().length < 3;
}

function validateTextLocation(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return "Required.";
  if (isAllDigits(trimmed)) return "Please enter a real location (not only numbers).";
  if (isTooShort(trimmed)) return "Please be more specific (at least 3 characters).";
  return undefined;
}

export default function RequestForm({
  requestType,
  title,
  description,
  showPickupAt = false,
  showCarsNeeded = false,
  initialValues,
}: RequestFormProps) {
  const router = useRouter();
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

  const [partySize, setPartySize] = useState<number>(initialValues?.partySize ?? 1);
  const [bookedForSelf, setBookedForSelf] = useState(true);
  const [pickup, setPickup] = useState<string>(initialValues?.pickup ?? "");
  const [pickupNotes, setPickupNotes] = useState<string>(initialValues?.pickupNotes ?? "");
  const [dropoff, setDropoff] = useState<string>(initialValues?.dropoff ?? "");
  const [pickupAtInput, setPickupAtInput] = useState<string>(initialValues?.pickupAtInput ?? "");
  const [carsNeeded, setCarsNeeded] = useState<number>(initialValues?.carsNeeded ?? 1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft | null>(null);
  const [quoteEstimates, setQuoteEstimates] = useState<QuoteEstimates | null>(null);

  function validatePickupAt(input: string) {
    if (!input.trim()) return "Required.";
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return "Please choose a valid time.";
    if (parsed.getTime() <= Date.now()) return "Pickup time must be in the future.";
    return undefined;
  }

  function validateForm(): boolean {
    const next: FieldErrors = {};

    if (!Number.isFinite(partySize) || partySize < 1) {
      next.partySize = "Must be at least 1 rider.";
    }

    const pickupErr = validateTextLocation(pickup);
    if (pickupErr) next.pickup = pickupErr;

    const dropoffErr = validateTextLocation(dropoff);
    if (dropoffErr) next.dropoff = dropoffErr;

    if (showPickupAt) {
      const pickupAtErr = validatePickupAt(pickupAtInput);
      if (pickupAtErr) next.pickupAt = pickupAtErr;
    }

    if (showCarsNeeded && (!Number.isFinite(carsNeeded) || carsNeeded < 1)) {
      next.carsNeeded = "Must be at least 1 car.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildPayload(): QuoteInput {
    return {
      type: requestType,
      pickup: pickup.trim(),
      dropoff: dropoff.trim(),
      bookedForSelf,
      sourceCarpoolId: initialValues?.sourceCarpoolId,
      pickupNotes: pickupNotes.trim() || undefined,
      partySize,
      pickupAt: showPickupAt ? new Date(pickupAtInput).toISOString() : undefined,
      carsNeeded: showCarsNeeded ? carsNeeded : undefined,
    };
  }

  async function onSubmit() {
    setSubmitError("");
    setSubmitSuccess(false);

    if (!validateForm()) return;
    setSubmitting(true);

    try {
      const payload = buildPayload();
      const res = await fetch("/api/requests/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || body?.message || "Quote failed.");
      }

      const quote = body?.quote;
      if (!quote?.request || !quote?.estimates) {
        throw new Error("Quote response was incomplete.");
      }

      setQuoteDraft(quote.request as QuoteDraft);
      setQuoteEstimates(quote.estimates as QuoteEstimates);
      setQuoteOpen(true);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong.");
      setQuoteOpen(false);
      setQuoteDraft(null);
      setQuoteEstimates(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function onConfirmQuote() {
    if (!quoteDraft) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/requests/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteDraft),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || body?.message || "Request failed.");
      }

      setSubmitSuccess(true);
      try {
        localStorage.setItem(
          "lastRideRequest",
          JSON.stringify({
            pickupLabel: quoteDraft.pickup.label,
            dropoffLabel: quoteDraft.dropoff.label,
            pickupAt: quoteDraft.pickupAt,
            partySize: quoteDraft.partySize,
            type: quoteDraft.type,
          })
        );
      } catch {}

      router.push("/request/success");
      setQuoteOpen(false);
      setQuoteDraft(null);
      setQuoteEstimates(null);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong.");
      setQuoteOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  function onEditQuote() {
    setQuoteOpen(false);
  }

  function onCancelQuote() {
    setQuoteOpen(false);
    setQuoteDraft(null);
    setQuoteEstimates(null);
  }

  return (
    <main className="app-shell min-h-screen px-6 py-12 text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-xl">
        <div className="surface-card rounded-[32px] p-8">
          <div className="flex items-center justify-between gap-4">
            <BrandMark />
            <Link
              href="/dashboard?requestOptions=1"
              className="btn-secondary px-4 py-2 text-sm"
              aria-label="Back to request options"
            >
              Back
            </Link>
          </div>

          <h1 className="font-heading mt-8 text-3xl font-semibold text-[var(--primary)]">
            {title}
          </h1>
          <p className="text-muted mt-1 text-sm">{description}</p>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Who is this ride for?</label>
              <div className="surface-panel grid gap-2 rounded-2xl p-3">
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="bookedForSelf"
                    checked={bookedForSelf}
                    onChange={() => setBookedForSelf(true)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Myself</span>
                    <span className="text-muted block text-xs">
                      GPS-based rider sharing can be requested later if you consent.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="bookedForSelf"
                    checked={!bookedForSelf}
                    onChange={() => setBookedForSelf(false)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Someone else</span>
                    <span className="text-muted block text-xs">
                      Pickup and drop-off pins stay authoritative for third-party bookings.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">Number of riders</label>
              <input
                type="number"
                min={1}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="app-input rounded-xl p-3"
              />
              {errors.partySize ? <p className="text-sm text-red-600">{errors.partySize}</p> : null}
            </div>

            <div className="grid gap-2">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Pick-up location</label>
                <input
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Type a location (e.g., Campus Center)"
                  className="app-input rounded-xl p-3"
                />
                {errors.pickup ? (
                  <p className="text-sm text-red-600">{errors.pickup}</p>
                ) : (
                  <p className="text-muted text-xs">Be specific so your driver can find you.</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestedPickups.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPickup(p)}
                    className="btn-secondary px-3 py-1 text-sm"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="grid gap-1">
                <label className="text-sm font-medium">
                  Pick-up notes <span className="text-muted">(optional)</span>
                </label>
                <textarea
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  placeholder="e.g., back entrance near the road"
                  className="app-input min-h-[84px] rounded-xl p-3"
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
                  className="app-input rounded-xl p-3"
                />
                {errors.pickupAt ? <p className="text-sm text-red-600">{errors.pickupAt}</p> : null}
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
                  className="app-input rounded-xl p-3"
                />
                {errors.carsNeeded ? <p className="text-sm text-red-600">{errors.carsNeeded}</p> : null}
              </div>
            ) : null}

            <div className="grid gap-1">
              <label className="text-sm font-medium">Destination</label>
              <input
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                placeholder="Type your destination"
                className="app-input rounded-xl p-3"
              />
              {errors.dropoff ? <p className="text-sm text-red-600">{errors.dropoff}</p> : null}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="btn-primary px-5 py-3 text-sm disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Confirm & Request"}
              </button>

              {submitSuccess ? <span className="text-sm text-green-700">Request sent.</span> : null}
            </div>

            <p className="text-muted mt-2 text-xs">You&apos;ll review a quote before confirming.</p>
            {submitError ? (
              <PaymentsSupportMessage message={submitError} className="text-sm text-red-600" />
            ) : null}
          </div>

          {quoteOpen && quoteDraft ? (
            <div
              className="fixed inset-0 z-50"
              role="dialog"
              aria-modal="true"
              aria-label="Confirm quote"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={onEditQuote}
                aria-label="Close quote"
              />

              <div className="surface-card absolute left-1/2 top-1/2 w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 text-[var(--foreground)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Review your quote</h2>
                    <p className="text-muted mt-1 text-sm">
                      Confirm to place your request, or edit details.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onEditQuote}
                    className="btn-ghost rounded-lg px-2 py-1 text-sm text-muted"
                    aria-label="Close modal"
                  >
                    x
                  </button>
                </div>

                <div className="mt-4 grid gap-3 text-sm">
                  <div>
                    <span className="font-medium">Pickup:</span> {quoteDraft.pickup.label}
                  </div>
                  <div>
                    <span className="font-medium">Destination:</span> {quoteDraft.dropoff.label}
                  </div>
                  <div>
                    <span className="font-medium">Riders:</span> {quoteDraft.partySize}
                  </div>
                  <div>
                    <span className="font-medium">Booking for:</span>{" "}
                    {quoteDraft.bookedForSelf ? "Myself" : "Someone else"}
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
                      <span className="font-medium">Cars needed:</span> {quoteDraft.carsNeeded}
                    </div>
                  ) : null}
                  {quoteDraft.pickupNotes ? (
                    <div>
                      <span className="font-medium">Pickup notes:</span> {quoteDraft.pickupNotes}
                    </div>
                  ) : null}
                </div>

                <div className="surface-panel mt-4 rounded-2xl p-4">
                  <div className="text-sm font-medium">Estimates</div>
                  <div className="mt-2 text-sm">
                    Estimated wait time:{" "}
                    <span className="font-medium">
                      {quoteEstimates ? `${quoteEstimates.waitMinutes} min` : "-"}
                    </span>
                  </div>
                  <div className="mt-1 text-sm">
                    Estimated price range:{" "}
                    <span className="font-medium">
                      {quoteEstimates
                        ? `$${quoteEstimates.priceMin}-$${quoteEstimates.priceMax}`
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onEditQuote}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={onCancelQuote}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onConfirmQuote}
                    disabled={submitting}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Confirm request"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
