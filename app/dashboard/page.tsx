/**
 * Dashboard Page
 * 
 * Main app page shown after user signs up or signs in.
 * Contains navigation to request rides and view carpools.
 * 
 * AUTHENTICATION PROTECTION:
 * - This page requires user to be authenticated (signed in)
 * - On page load, checks if user has valid session
 * - If not authenticated: redirects to sign in page
 * - If authenticated: shows dashboard with Request and Carpool buttons
 * 
 * MVP:
 *   - Client-side session check on page load
 *   - Basic redirect if not authenticated
 * 
 * Production:
 *   - Use Next.js middleware for route protection (more secure)
 *   - Server-side session validation
 *   - Add loading states during authentication check
 *   - Cache session check to avoid repeated API calls
 */

"use client";

// Dashboard is a client component because it checks auth state on the client
// and uses local UI state (alerts, menus).
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RequestButton from "@/components/requestbutton";
import Link from "next/link";
import { Playfair_Display, Work_Sans } from "next/font/google";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function DashboardPage() {
  const router = useRouter();

  // MVP alerts list; swap with backend-driven notifications later.
  const alerts = useMemo(
    () => [
      { tone: "bg-red-500", text: "New carpool request to BDL" },
      { tone: "bg-amber-400", text: "2 people joined your carpool request" },
      { tone: "bg-amber-400", text: "We found a driver for your trip to JFK" },
    ],
    []
  );
  
  // State to track authentication check
  // null = checking, true = authenticated, false = not authenticated
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Controls whether the alert list is expanded.
  const [alertsOpen, setAlertsOpen] = useState(true);

  /**
   * Check if user is authenticated
   * 
   * FLOW:
   * 1. Call session API endpoint to check if user has valid session
   * 2. Session API checks cookie/header for session token
   * 3. If valid session exists: user is authenticated
   * 4. If no session or invalid: user is not authenticated
   * 
   * MVP: Client-side check on page load
   * Production: Use server-side middleware for better security
   */
  useEffect(() => {
    async function checkAuthentication() {
      try {
        // MVP: token in localStorage; production should use httpOnly cookies.
        const sessionToken = localStorage.getItem("sessionToken");

        // Session API validates either the Authorization header or cookies.
        const res = await fetch("/api/auth/session", {
          method: "GET",
          headers: sessionToken
            ? {
                // MVP: send token in Authorization header.
                Authorization: `Bearer ${sessionToken}`,
              }
            : {},
        });

        if (res.ok) {
          // Valid session: allow dashboard render.
          setIsAuthenticated(true);
        } else {
          // Invalid session: clear token and bounce to sign-in.
          setIsAuthenticated(false);
          
          localStorage.removeItem("sessionToken");
          
          router.push("/signin");
        }
      } catch (error) {
        // Any error => treat as not authenticated for MVP safety.
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
        localStorage.removeItem("sessionToken");
        router.push("/signin");
      } finally {
        setIsLoading(false);
      }
    }

    // Kick off auth check on mount.
    checkAuthentication();
  }, [router]);

  // Loading state while auth check runs.
  if (isLoading) {
    return (
      <main
        className={`min-h-screen bg-[#f4ecdf] bg-[radial-gradient(circle_at_top,_#f9f2e8,_#f4ecdf_60%)] ${bodyFont.className}`}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-[#6b5f52]">Loading...</p>
        </div>
      </main>
    );
  }

  // If unauthenticated, do not render anything (redirect in progress).
  if (!isAuthenticated) {
    return null; // Don't render anything while redirecting
  }

  return (
    <main
      className={`min-h-screen bg-[#f4ecdf] bg-[radial-gradient(circle_at_top,_#f9f2e8,_#f4ecdf_60%)] ${bodyFont.className}`}
    >
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 text-[#0a1b3f]">
        {/* Header with greeting + MVP utility icons */}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1
              className={`${displayFont.className} text-3xl sm:text-4xl`}
            >
              Welcome, Chioma
            </h1>
            <p className="mt-1 text-sm text-[#6b5f52]">
              Ready for your next ride?
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Profile icon keeps users on the dashboard for MVP */}
            <Link
              href="/dashboard"
              aria-label="Profile"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c2.2-4 13.8-4 16 0" />
              </svg>
            </Link>
            <Link
              href="/in-progress"
              aria-label="Settings"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.5.9Z" />
              </svg>
            </Link>
            <Link
              href="/in-progress"
              aria-label="Help"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" />
                <circle cx="12" cy="17" r="1" />
              </svg>
            </Link>
            <Link
              href="/in-progress"
              aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 8a6 6 0 1 0-12 0c0 7-2 7-2 7h16s-2 0-2-7" />
                <path d="M9 18a3 3 0 0 0 6 0" />
              </svg>
              <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-semibold text-white">
                5
              </span>
            </Link>
          </div>
        </header>

        {/* Alerts panel with collapse toggle */}
        <section className="relative mt-8 rounded-2xl border-2 border-[#0a3570] bg-[#f4ecdf] p-6">
          <button
            type="button"
            onClick={() => setAlertsOpen((prev) => !prev)}
            className="absolute -top-4 left-4 flex items-center gap-2 rounded-t-lg bg-[#0a3570] px-4 py-2 text-sm font-semibold text-white"
            aria-expanded={alertsOpen}
          >
            Alerts
            <span
              className={`text-xs transition-transform ${
                alertsOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>
          {alertsOpen ? (
            <ul className="mt-2 space-y-4">
              {alerts.map((alert) => (
                <li
                  key={alert.text}
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <span
                      className={`h-3 w-3 rounded-sm ${alert.tone}`}
                      aria-hidden="true"
                    />
                    <span>{alert.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-4 py-1 text-xs font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-4 py-1 text-xs font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* Primary prompt */}
        <h2
          className={`${displayFont.className} mt-10 text-center text-3xl sm:text-4xl`}
        >
          What would you like to do today?
        </h2>

        <div className="mt-10 grid gap-10">
          {/* Request a ride row */}
          <div className="grid gap-6 md:grid-cols-[220px_auto] md:items-center">
            <RequestButton
              label="Request a Ride"
              unstyled
              className="w-full rounded-none bg-[#0a3570] px-5 py-3 text-base font-semibold text-white hover:bg-[#0a2d5c]"
            />
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <svg
                viewBox="0 0 120 60"
                className="h-10 w-24 text-[#0a1b3f]"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M2 30c12-16 24-16 36 0s24 16 36 0 24-16 36 0" />
                <path d="M92 16l22 14-22 14" />
              </svg>
              <div className="flex-1 rounded-2xl border-2 border-[#0a3570] bg-[#f8efe3] p-5">
                <p className="text-lg font-semibold">
                  Wanna split a ride with a friend?
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {/* Carpool creation flow */}
                  <Link
                    href="/carpool/create"
                    className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-5 py-2 text-sm font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                  >
                    Create Carpool Request
                  </Link>
                  {/* Carpool discovery flow */}
                  <Link
                    href="/carpool/feed"
                    className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-5 py-2 text-sm font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                  >
                    Join Available Carpool
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Offer a ride row */}
          <div className="grid gap-6 md:grid-cols-[220px_auto] md:items-center">
            <Link
              href="/register"
              className="w-full rounded-none bg-[#0a3570] px-5 py-3 text-center text-base font-semibold text-white hover:bg-[#0a2d5c]"
            >
              Offer a Ride
            </Link>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <svg
                viewBox="0 0 120 60"
                className="h-10 w-24 text-[#0a1b3f]"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M2 30c12-16 24-16 36 0s24 16 36 0 24-16 36 0" />
                <path d="M92 16l22 14-22 14" />
              </svg>
              <div className="flex-1 rounded-2xl border-2 border-[#0a3570] bg-[#f8efe3] p-5">
                <p className="text-lg font-semibold">
                  Have extra seats? Offer a ride today!
                </p>
                <p className="text-xs text-[#6b5f52]">
                  Help others and earn. Verified .edu email required!
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {/* Driver tools placeholder */}
                  <Link
                    href="/in-progress"
                    className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-5 py-2 text-sm font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                  >
                    My driver dashboard
                  </Link>
                  {/* Driver onboarding placeholder */}
                  <Link
                    href="/in-progress"
                    className="rounded-full border border-[#0a3570] bg-[#e9dcc9] px-5 py-2 text-sm font-semibold text-[#0a1b3f] hover:bg-[#dbc8ad]"
                  >
                    Become a driver
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
