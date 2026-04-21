/**
 * Sign In Page (Client)
 *
 * User authentication form with optional post-signin redirect.
 * Stores the session token in localStorage for MVP flows.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

export default function SignInClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const googleButtonRef = useRef<HTMLDivElement | null>(null); // Hold the GIS button mount node.

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [googleReady, setGoogleReady] = useState(false); // Track GIS script readiness.
  const [googleError, setGoogleError] = useState(""); // Track Google sign-in errors.

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID; // Read the Google client ID.

  useEffect(() => { // Handle client-side navigation when GIS is already loaded.
    if ((window as any)?.google?.accounts?.id) { // Detect the loaded GIS script.
      setGoogleReady(true); // Mark Google as ready without waiting for onLoad.
    }
  }, []);

  async function handleGoogleCredentialResponse(response: { credential?: string }) { // Handle GIS credential response.
    setGoogleError(""); // Clear any previous Google error message.
    const idToken = response?.credential; // Extract the ID token from the response.
    if (!idToken) { // Guard against missing credentials.
      setGoogleError("Google sign-in failed. Please try again."); // Show a user-friendly error.
      return; // Stop processing without a token.
    }

    try { // Wrap the request in a try/catch for errors.
      const res = await fetch("/api/auth/google", { // Exchange the ID token for a session.
        method: "POST", // Use POST for token exchange.
        headers: { "Content-Type": "application/json" }, // Send JSON payload.
        body: JSON.stringify({ idToken }) // Include the ID token in the request body.
      });

      const data = await res.json(); // Parse the server response.
      if (!res.ok) { // Handle non-200 responses.
        const message = String(data?.error || "Google sign-in failed"); // Normalize the backend error message.
        if (message.toLowerCase().includes("campus")) { // Translate domain errors into a friendlier message.
          setGoogleError("This app currently supports Smith emails only. Please use your smith.edu account."); // Show a clearer domain error.
          return; // Stop here after showing the message.
        }
        throw new Error(message); // Surface other errors.
      }

      router.push(next && next.startsWith("/") ? next : "/dashboard"); // Redirect on success.
    } catch (e: any) { // Catch and display errors from the exchange.
      setGoogleError(e?.message || "Google sign-in failed"); // Show a fallback error message.
    }
  }

  useEffect(() => { // Initialize GIS once the script is loaded.
    if (!googleReady) { // Exit early until the GIS script is ready.
      return; // Prevent initializing before the script loads.
    }
    if (!googleClientId) { // Ensure the client ID is configured.
      setGoogleError("Google sign-in is not configured."); // Show a configuration error.
      return; // Stop initialization without a client ID.
    }

    const google = (window as any)?.google; // Access the global GIS object.
    if (!google?.accounts?.id || !googleButtonRef.current) { // Verify GIS and the button ref.
      return; // Exit if the GIS library or button ref is missing.
    }

    google.accounts.id.initialize({ // Initialize the GIS client.
      client_id: googleClientId, // Provide the OAuth client ID.
      callback: handleGoogleCredentialResponse // Handle credential responses.
    });

    googleButtonRef.current.innerHTML = ""; // Clear any previous button renders.
    google.accounts.id.renderButton(googleButtonRef.current, { // Render the Google sign-in button.
      theme: "outline", // Use the outline button style.
      size: "large", // Render a large button.
      text: "signin_with", // Use the "Sign in with Google" text.
      shape: "pill" // Use a pill-shaped button.
    });
  }, [googleReady, googleClientId]); // Re-run when the script or config changes.

  function validateForm(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      nextErrors.password = "Password is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sign in failed");
      }

      const data = await res.json();

      // Store session token
      // MVP: Store in localStorage (accessible to JavaScript - less secure)
      // Production: Use httpOnly cookies (set by server, not accessible to JavaScript)
      //             Remove this localStorage code and rely on cookies only
      if (data.sessionToken) {
        localStorage.setItem("sessionToken", data.sessionToken);
      }

      // Redirect to next path when provided; default to dashboard.
      // This supports post-signup driver intent flows.
      const nextPath = next && next.startsWith("/") ? next : "/dashboard";
      router.push(nextPath);
    } catch (e: any) {
      setSubmitError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4ecdf] p-6">
      <Script
        src="https://accounts.google.com/gsi/client"
        async
        defer
        onLoad={() => setGoogleReady(true)}
      />
      <div className="mx-auto max-w-xl">
      <Link
        href="/"
        className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
        aria-label="Back to home"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      <h1 className="mt-6 text-2xl font-semibold">Sign In</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Sign in to your WintRides account.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        {/* Email */}
        <div className="grid gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.name@university.edu"
            className="rounded-xl border p-3"
            disabled={submitting}
          />
          {errors.email ? (
            <p className="text-sm text-red-600">{errors.email}</p>
          ) : null}
        </div>

        {/* Password */}
        <div className="grid gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="rounded-xl border p-3"
            disabled={submitting}
          />
          {errors.password ? (
            <p className="text-sm text-red-600">{errors.password}</p>
          ) : null}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-xl bg-[#0437F2] px-4 py-3 font-medium text-white hover:bg-[#032cc2] disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {submitting ? "Signing In..." : "Sign In"}
        </button>

        {/* Error Message */}
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {submitError}
          </div>
        )}

        {/* Register Link */}
        <p className="mt-4 text-center text-sm text-neutral-600">
          Don't have an account?{" "}
          <Link href="/register" className="font-medium text-black hover:underline">
            Create one
          </Link>
        </p>

        <div className="mt-4 grid gap-3">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-neutral-300" />
            <span className="text-xs text-neutral-500">or</span>
            <span className="h-px flex-1 bg-neutral-300" />
          </div>
          <div ref={googleButtonRef} className="flex justify-center" />
          {googleError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {googleError}
            </div>
          )}
        </div>
      </form>
      </div>
    </main>
  );
}
