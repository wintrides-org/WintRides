import type { CarpoolThread } from "@/types/carpool";

/** Local departure moment from ride date and window start (HH:mm). */
export function carpoolDepartureDate(
  carpool: Pick<CarpoolThread, "date" | "timeWindow">
): Date {
  const [y, m, d] = carpool.date.split("-").map((n) => parseInt(n, 10));
  const [hh, mm = "0"] = carpool.timeWindow.start.split(":");
  const h = parseInt(hh, 10);
  const min = parseInt(mm, 10);
  return new Date(y, (m || 1) - 1, d || 1, h, Number.isFinite(min) ? min : 0, 0, 0);
}

/** Confirmed riders may leave only while more than 2 hours remain before departure. */
export function canCancelConfirmedParticipation(
  carpool: Pick<CarpoolThread, "date" | "timeWindow">
): boolean {
  const dep = carpoolDepartureDate(carpool);
  return dep.getTime() - Date.now() > 2 * 60 * 60 * 1000;
}
