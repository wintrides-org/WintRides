/**
 * Sign In Page (Client)
 *
 * User authentication form with optional post-signin redirect.
 * Stores the session token in localStorage for MVP flows.
 */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SignInClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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
          className="mt-4 rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-neutral-800 disabled:bg-neutral-400 disabled:cursor-not-allowed"
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
      </form>
      </div>
    </main>
  );
}
