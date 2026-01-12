"use client";

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

export default function RequestSuccessPage() {
  return (
    <main
      className={`min-h-screen bg-[#f4ecdf] px-6 py-16 text-[#0a1b3f] ${bodyFont.className}`}
    >
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/dashboard"
          className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
          aria-label="Back to dashboard"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      </div>
      <div className="relative mx-auto mt-6 w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-[#0a3570] bg-[#fdf7ef] px-8 py-14 text-center shadow-[0_18px_40px_rgba(10,27,63,0.15)]">
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
        <h1 className={`${displayFont.className} text-3xl text-[#0a3570]`}>
          Congratulations, your request has been successfully placed
        </h1>
        <p className="mt-3 text-sm text-[#6b5f52]">
          We're finding a ride for you. Remember, WintRides gotchyu!
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-full bg-[#0a3570] px-6 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(10,27,63,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0a2d5c]"
        >
          Go to Home
        </Link>
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
