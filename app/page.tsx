/**
 * Home Page - Landing page
 *
 * This is the landing page where users start.
 * Presents the WintRides brand and value proposition
 * Provides a clear CTA to the users to sign up or sign in
 */

"use client";

import Link from "next/link";

export default function HomePage() {
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
        </div>
      </div>
    </main>
  );
}
