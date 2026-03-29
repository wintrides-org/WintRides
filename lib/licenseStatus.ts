type LicenseStatus = "valid" | "expiringSoon" | "expired" | "missing";

export type LicenseStatusResult = {
  status: LicenseStatus;
  daysRemaining: number | null;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseDateOnly(value?: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function getLicenseStatus(licenseExpirationDate?: string): LicenseStatusResult {
  const expiration = parseDateOnly(licenseExpirationDate);
  if (!expiration) {
    return { status: "missing", daysRemaining: null };
  }

  const today = startOfToday();
  const daysRemaining = Math.ceil((expiration.getTime() - today.getTime()) / MS_PER_DAY);

  if (daysRemaining < 0) {
    return { status: "expired", daysRemaining: null };
  }

  if (daysRemaining <= 7) {
    return { status: "expiringSoon", daysRemaining };
  }

  return { status: "valid", daysRemaining };
}
