"use client";

import Link from "next/link";
const displayFont = { className: "font-heading" };
// Defines the confetti for the page
const confettiPieces = [
  { left: "8%", delay: "0s", duration: "2.4s", color: "#ff6b6b" },
  { left: "18%", delay: "0.1s", duration: "2.2s", color: "#ffd93d" },
  { left: "28%", delay: "0.2s", duration: "2.6s", color: "#6bcB77" },
  { left: "38%", delay: "0.15s", duration: "2.3s", color: "#4d96ff" },
  { left: "48%", delay: "0.25s", duration: "2.5s", color: "#845ec2" },
  { left: "58%", delay: "0.05s", duration: "2.4s", color: "#ff9f1c" },
  { left: "68%", delay: "0.3s", duration: "2.7s", color: "#f15bb5" },
  { left: "78%", delay: "0.2s", duration: "2.3s", color: "#00bbf9" },
  { left: "88%", delay: "0.1s", duration: "2.6s", color: "#9bdeac" },
];

// HTML rendering of the success page
export default function RequestSuccessPage() {
  return (
    <main className="page-shell px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/dashboard"
          className="icon-button grid h-12 w-12 place-items-center"
          aria-label="Back to dashboard"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      </div>
      <div className="surface-card relative mx-auto mt-6 w-full max-w-2xl overflow-hidden rounded-3xl px-8 py-14 text-center">
        <div className="pointer-events-none absolute inset-0">
          {confettiPieces.map((piece, index) => (
            <span
              key={`confetti-${index}`}
              className="absolute h-3 w-2 rounded-sm"
              style={{
                left: piece.left,
                top: "-12%",
                backgroundColor: piece.color,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
              }}
            />
          ))}
        </div>
        <h1 className={`${displayFont.className} text-3xl text-[var(--primary)]`}>
          Congratulations, your request has been successfully placed
        </h1>
        <p className="text-muted mt-3 text-sm">
          We're finding a ride for you. Remember, WintRides gotchyu!
        </p>
        <Link
          href="/dashboard"
          className="btn-primary mt-8 px-6 py-2 text-sm font-semibold"
        >
          Go to Home
        </Link>
        {/* Note that span is recognized by CSS. jsx maps them to DOM elements */}
        <style jsx>{` 
          span {
            animation-name: confetti-fall;
            animation-timing-function: ease-in;
            animation-iteration-count: 1;
            animation-fill-mode: forwards;
          }
          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(260px) rotate(240deg);
              opacity: 0;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            span {
              animation: none;
            }
          }
        `}</style>
      </div>
    </main>
  );
}
