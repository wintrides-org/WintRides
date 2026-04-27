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
import BrandMark from "@/components/BrandMark";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsWindow = Window & {
  google?: {
    accounts?: {
      id?: {
        initialize: (config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
        }) => void;
        renderButton: (
          element: HTMLElement,
          options: {
            theme: string;
            size: string;
            text: string;
            shape: string;
          }
        ) => void;
      };
    };
  };
};

export default function HomePage() {
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => { // Handle client-side navigation when GIS is already loaded.
    const googleWindow = window as GoogleAccountsWindow;
    if (googleWindow.google?.accounts?.id) { // Detect the loaded GIS script.
      setGoogleReady(true); // Mark Google as ready without waiting for onLoad.
    }
  }, []);

  async function handleGoogleCredentialResponse(response: GoogleCredentialResponse) {
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
          setGoogleError("This app currently institution emails. Please use your .edu account.");
          return;
        }
        throw new Error(message);
      }

      window.location.href = "/dashboard";
    } catch (e: unknown) {
      setGoogleError(e instanceof Error ? e.message : "Google sign-in failed");
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

    const google = (window as GoogleAccountsWindow).google;
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
      className="min-h-screen px-6 py-10"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.62), rgba(255,255,255,0.72)), url('/campus.jpg')",
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
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center">
        <div
          className="mx-auto w-full max-w-4xl rounded-[36px] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--background)_82%,transparent)] p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-8"
        >
          <section className="mx-auto flex w-full max-w-2xl flex-col justify-between gap-12 rounded-[28px] bg-[color:color-mix(in_srgb,var(--background)_82%,transparent)] px-8 py-12 text-center md:px-10 md:py-14">
            <div>
              <p className="eyebrow">Campus ridesharing</p>
              <div className="mt-5 flex justify-center">
                <BrandMark className="text-3xl" />
              </div>
              <h1 className="font-heading mx-auto mt-10 max-w-xl text-5xl leading-[1.02] sm:text-6xl">
                Your Campus 
                <br></br>
                Your Rides
              </h1>
              <p className="text-muted mx-auto mt-5 max-w-lg text-lg leading-8">
                Got a car? Make it count. Need a ride? Tap and go.
              </p>
            </div>

            <div className="grid justify-center gap-4">
              <div className="grid gap-4 sm:flex sm:flex-wrap sm:justify-center">
              <Link href="/register" className="btn-primary pulse-soft px-8 py-4 text-base">
                Create account
              </Link>
              <Link href="/signin" className="btn-secondary px-8 py-4 text-base">
                Sign in
              </Link>
              </div>

              <div className="mx-auto mt-2 grid w-full max-w-md gap-3">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-muted text-xs">Continue with Google</span>
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
              <div ref={googleButtonRef} className="flex justify-center" />
              {googleError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {googleError}
                </div>
              )}
            </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
