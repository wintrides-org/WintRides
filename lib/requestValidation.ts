import type { Location, RequestType } from "@/types/request";

export type QuoteInput = {
  type: RequestType;
  partySize: number;
  pickup: Location | string;
  dropoff: Location | string;
  pickupNotes?: string;
  pickupAt?: string;
  carsNeeded?: number;
};

export type NormalizedRequest = {
  type: RequestType;
  partySize: number;
  pickup: Location;
  dropoff: Location;
  pickupNotes?: string;
  pickupAt: string;
  carsNeeded: number;
};

export type QuoteEstimates = {
  waitMinutes: number;
  priceMin: number;
  priceMax: number;
};

function isAllDigits(value: string) {
  return /^\d+$/.test(value.trim());
}

function isTooShort(value: string) {
  return value.trim().length < 3;
}

function validateTextLocation(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return "Required.";
  if (isAllDigits(trimmed)) return "Please enter a real location (not only numbers).";
  if (isTooShort(trimmed)) return "Please be more specific (at least 3 characters).";
  return undefined;
}

function normalizeLocation(input: Location | string, field: "pickup" | "dropoff") {
  if (typeof input === "string") {
    const label = input.trim();
    const error = validateTextLocation(label);
    return {
      error: error ? `${field} ${error}` : undefined,
      location: { label, address: label },
    };
  }

  if (input && typeof input === "object") {
    const label = input.label?.trim() || input.address?.trim() || "";
    const address = input.address?.trim() || label;
    const error = validateTextLocation(label);
    return {
      error: error ? `${field} ${error}` : undefined,
      location: { label, address },
    };
  }

  return { error: `${field} Required.` };
}

function validatePickupAt(value: string) {
  if (!value?.trim()) return "pickupAt Required.";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "pickupAt Invalid time.";
  if (parsed.getTime() <= Date.now()) return "pickupAt must be in the future.";
  return undefined;
}

function toIso(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

/** Fake MVP time logic: replace with more accurate logic */
export function estimateWaitMinutes(partySize: number) {
  const base = 4;
  return Math.min(20, base + Math.max(0, partySize - 1) * 2);
}

/** Fake MVP price logic: replace with more accurate logic */
export function estimatePriceRange(partySize: number) {
  const base = 7;
  const perRider = 2;
  const min = base + (partySize - 1) * perRider;
  const max = min + 4;
  return { min, max };
}

export function buildQuote(
  input: QuoteInput
): { data?: NormalizedRequest; errors?: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input?.type) {
    errors.type = "type Required.";
  }

  if (!Number.isFinite(input.partySize) || input.partySize < 1) {
    errors.partySize = "partySize Must be at least 1.";
  }

  const pickupResult = normalizeLocation(input.pickup, "pickup");
  if (pickupResult.error) {
    errors.pickup = pickupResult.error;
  }

  const dropoffResult = normalizeLocation(input.dropoff, "dropoff");
  if (dropoffResult.error) {
    errors.dropoff = dropoffResult.error;
  }

  if (input.type === "SCHEDULED" || input.type === "GROUP") {
    const pickupAtError = validatePickupAt(input.pickupAt ?? "");
    if (pickupAtError) errors.pickupAt = pickupAtError;
  }

  if (input.type === "IMMEDIATE" && input.pickupAt) {
    const pickupAtError = validatePickupAt(input.pickupAt);
    if (pickupAtError) errors.pickupAt = pickupAtError;
  }

  if (input.type === "GROUP") {
    if (!Number.isFinite(input.carsNeeded) || (input.carsNeeded ?? 0) < 1) {
      errors.carsNeeded = "carsNeeded Must be at least 1.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const waitMinutes = estimateWaitMinutes(input.partySize);
  const providedPickupAt = input.pickupAt ? toIso(input.pickupAt) : undefined;
  const pickupAt =
    input.type === "IMMEDIATE" && !providedPickupAt
      ? new Date(Date.now() + waitMinutes * 60 * 1000).toISOString()
      : (providedPickupAt as string);

  return {
    data: {
      type: input.type,
      partySize: input.partySize,
      pickup: pickupResult.location as Location,
      dropoff: dropoffResult.location as Location,
      pickupNotes: input.pickupNotes?.trim() || undefined,
      pickupAt,
      carsNeeded: input.type === "GROUP" ? (input.carsNeeded as number) : 1,
    },
  };
}

export function buildEstimates(partySize: number): QuoteEstimates {
  const waitMinutes = estimateWaitMinutes(partySize);
  const price = estimatePriceRange(partySize);
  return {
    waitMinutes,
    priceMin: price.min,
    priceMax: price.max,
  };
}
