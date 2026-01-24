/**
 * Home Page - Landing page
 *
 * This is the landing page where users start.
 * Presents the WintRides brand and value proposition
 * Provides a clear CTA to the users to sign up or sign in
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";

export default function HomePage() {
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => { // Handle client-side navigation when GIS is already loaded.
    if ((window as any)?.google?.accounts?.id) { // Detect the loaded GIS script.
      setGoogleReady(true); // Mark Google as ready without waiting for onLoad.
    }
  }, []);

  async function handleGoogleCredentialResponse(response: { credential?: string }) {
    setGoogleError("");
    const idToken = response?.credential;
    if (!idToken) {
      setGoogleError("Google sign-in failed. Please try again.");
      return;
    }

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      const data = await res.json();
      if (!res.ok) {
        const message = String(data?.error || "Google sign-in failed");
        if (message.toLowerCase().includes("campus")) {
          setGoogleError("This app currently supports Smith emails only. Please use your smith.edu account.");
          return;
        }
        throw new Error(message);
      }

      window.location.href = "/dashboard";
    } catch (e: any) {
      setGoogleError(e?.message || "Google sign-in failed");
    }
  }

  useEffect(() => {
    if (!googleReady) {
      return;
    }
    if (!googleClientId) {
      setGoogleError("Google sign-in is not configured.");
      return;
    }

    const google = (window as any)?.google;
    if (!google?.accounts?.id || !googleButtonRef.current) {
      return;
    }

    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredentialResponse
    });

    googleButtonRef.current.innerHTML = "";
    google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill"
    });
  }, [googleReady, googleClientId]);

  return (
    <main
      className="min-h-screen px-6 py-12 text-[#1f2b37] flex items-center justify-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(251,247,241,0.88), rgba(251,247,241,0.88)), url('/campus.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Script
        src="https://accounts.google.com/gsi/client"
        async
        defer
        onLoad={() => setGoogleReady(true)}
      />
      {/* Centered card container to mimic the screenshot style */}
      <div className="card-reveal w-full max-w-2xl rounded-3xl bg-[#fdfaf5] px-10 py-14 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        <div className="text-center">
          {/* Brand wordmark */}
          <p className="font-brand text-[6.00rem] tracking-wide text-[#b28762]">
            WintRides
          </p>

          {/* Main headline */}
          <h1 className="font-nunito mt-0 text-[2.75rem] font-semibold leading-tight text-[#1E3A5F]">
            Drive when you can.
            <br />
            Ride when you want.
          </h1>

          {/* Supporting message */}
          <p className="font-nunito mt-6 text-[1.25rem] text-[#b28762]">
            Your campus, your community
          </p>

          {/* Primary call-to-action */}
          <div className="mt-9">
            <Link
              href="/register"
              className="pulse-soft inline-flex items-center justify-center rounded-full bg-[#e6c07a] px-12 py-4 text-[1.125rem] font-nunito font-medium text-white shadow-[0_8px_20px_rgba(230,192,122,0.35)] transition hover:translate-y-[-1px] hover:bg-[#ddb76d]"
            >
              Sign Up
            </Link>
          </div>

          {/* Secondary link for existing users */}
          <p className="font-nunito mt-8 text-sm text-[#6a7680]">
            Already signed up?{" "}
            <Link
              href="/signin"
              className="font-nunito font-medium text-[#2f6db3] underline"
            >
              Sign in
            </Link>
          </p>

          <div className="mt-6 grid gap-3">
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
        </div>
      </div>
    </main>
  );
}
