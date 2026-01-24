/**
 * GET /api/driver/license-status
 *
 * Returns current driver's license status for UI reminders.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserById } from "@/lib/mockUsers";
import { getLicenseStatus } from "@/lib/licenseStatus";

export async function GET(request: NextRequest) {
  try {
    const sessionToken =
      request.cookies.get("sessionToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!sessionToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const expirationDate = user.driverInfo?.licenseExpirationDate ?? undefined;
    const status = getLicenseStatus(expirationDate);

    return NextResponse.json(
      {
        licenseStatus: status.status,
        daysRemaining: status.daysRemaining,
        licenseExpirationDate: expirationDate ?? null
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching license status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch license status" },
      { status: 500 }
    );
  }
}
