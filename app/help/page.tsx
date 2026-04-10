"use client";

import Link from "next/link";
import { useState } from "react";
import { Playfair_Display, Work_Sans } from "next/font/google";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

type AnswerBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "note"; text: string }
  | { type: "linkParagraph"; prefix: string; linkLabel: string; href: string };

type FAQItem = {
  question: string;
  answer: AnswerBlock[];
};

type FAQSection = {
  title: string;
  items: FAQItem[];
};

const sections: FAQSection[] = [
  {
    title: "General",
    items: [
      {
        question: "What is WintRides?",
        answer: [
          {
            type: "paragraph",
            text: "WintRides is a centralized ride-sharing platform built for college students on rural and suburban campuses. Think of it as Uber for college campuses — it lets students request, offer, and share rides around campus towns and to key destinations like airports.",
          },
        ],
      },
      {
        question: "Who is WintRides for?",
        answer: [
          {
            type: "paragraph",
            text: "WintRides serves two groups:",
          },
          {
            type: "list",
            items: [
              "Riders — students who need reliable, affordable transportation.",
              "Drivers — students who want to earn extra income by offering rides in a safe, familiar environment.",
            ],
          },
        ],
      },
      {
        question: "How does pricing work?",
        answer: [
          {
            type: "paragraph",
            text: "Rides are currently priced at approximately $7 per rider. Pricing is based on the number of riders in a trip — the more people in a single ride, the higher the total cost of a trip.",
          },
          {
            type: "note",
            text: "Note: this is a placeholder pricing model and will be updated as WintRides grows. Keep an eye out for changes.",
          },
        ],
      },
    ],
  },
  {
    title: "For Riders",
    items: [
      {
        question: "What services are available to riders?",
        answer: [
          {
            type: "paragraph",
            text: "Riders have two options:",
          },
          {
            type: "list",
            items: [
              "Request a ride — book a dedicated trip to your destination.",
              "Carpool — find other students heading the same way and share the cost.",
            ],
          },
        ],
      },
      {
        question: "Why use WintRides instead of another ride-share app?",
        answer: [
          {
            type: "paragraph",
            text: "WintRides is designed around student needs — reliable scheduled rides, student-friendly pricing, and easy coordination for carpooling with people on your campus.",
          },
        ],
      },
    ],
  },
  {
    title: "For Drivers",
    items: [
      {
        question: "What services are available to drivers?",
        answer: [
          {
            type: "paragraph",
            text: "Drivers can participate in two ways:",
          },
          {
            type: "list",
            items: [
              "Offer a ride — pick up listed ride requests and earn income.",
              "Carpool — offer spare seats on trips you're already making to monetize rides you'd take anyway.",
            ],
          },
        ],
      },
      {
        question: "Is driving through WintRides safe?",
        answer: [
          {
            type: "paragraph",
            text: "Yes — WintRides operates within a familiar campus community, connecting you with fellow students rather than strangers from the general public.",
          },
        ],
      },
    ],
  },
  {
    title: "Testing & Onboarding",
    items: [
      {
        question: "How do I sign up?",
        answer: [
          {
            type: "paragraph",
            text: "Sign up using your Smith College email address.",
          },
        ],
      },
      {
        question: "What payment info should I use during testing?",
        answer: [
          {
            type: "paragraph",
            text: "Use this dummy card number for payment details: 4242 4242 4242 4242. Any future expiry date and any 3-digit CVV will work.",
          },
        ],
      },
      {
        question: "I'm testing the driver flow — what should I enter for my license?",
        answer: [
          {
            type: "paragraph",
            text: "Do not use your real license number. Keep the same format, but substitute different numbers in place of your actual digits.",
          },
        ],
      },
      {
        question: "Driver onboarding seems stuck — what do I do?",
        answer: [
          {
            type: "paragraph",
            text: `Driver payment setup is handled by Stripe, a third-party service, and can be a bit finicky. Here's what to try:`,
          },
          {
            type: "list",
            items: [
              'Keep going through all the Stripe steps until your driver dashboard shows "Payment setup complete."',
              "If it hasn't updated, reload the page.",
              'If it\'s still stuck, go to your Account → Payment page and click the "Review payment setup" button.',
            ],
          },
        ],
      },
      {
        question: "Where can I find full usage instructions?",
        answer: [
          {
            type: "linkParagraph",
            prefix: "Detailed usage instructions are available on the ",
            linkLabel: "WintRides GitHub page",
            href: "https://github.com/wintrides-org/WintRides?tab=readme-ov-file#usage-instructions",
          },
        ],
      },
    ],
  },
];

function FAQAnswer({ blocks }: { blocks: AnswerBlock[] }) {
  return (
    <div className="space-y-4 border-t border-[#d5c5b2] px-6 pb-6 pt-5 text-sm leading-7 text-[#24324d] sm:px-8">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return <p key={index}>{block.text}</p>;
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="space-y-2 pl-5">
              {block.items.map((item) => (
                <li key={item} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "note") {
          return (
            <div
              key={index}
              className="rounded-2xl border border-[#d8c3a6] bg-[#f6ead7] px-4 py-3 text-[#6b4e1f]"
            >
              {block.text}
            </div>
          );
        }

        return (
          <p key={index}>
            {block.prefix}
            <a
              href={block.href}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#0a3570] underline decoration-[#0a3570]/50 underline-offset-4 hover:text-[#092a59]"
            >
              {block.linkLabel}
            </a>
            .
          </p>
        );
      })}
    </div>
  );
}

function TopRightIcons() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/account/profile"
        aria-label="Account"
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
        href="/help"
        aria-label="Help"
        className="grid h-10 w-10 place-items-center rounded-full border border-[#0a3570] bg-[#e9dcc9] text-[#0a3570]"
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
  );
}

export default function HelpPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  function toggleItem(key: string) {
    setOpenItems((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <main className={`${bodyFont.className} min-h-screen bg-[#f4ecdf] text-[#0a1b3f]`}>
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-[#0a3570] px-4 py-2 text-sm font-semibold text-[#0a3570] transition hover:bg-[#e9dcc9]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to Dashboard
          </Link>
          <TopRightIcons />
        </header>

        <section className="mt-10">
          <h1 className={`${displayFont.className} text-4xl text-[#0a1b3f] sm:text-5xl`}>
            WintRides FAQ
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-[#6b5f52] sm:text-xl">
            Reliable, affordable rides for college students on rural and suburban campuses.
          </p>
        </section>

        <div className="mt-12 space-y-12">
          {sections.map((section) => (
            <section
              key={section.title}
              className="border-t border-[#d8cdbf] pt-8 first:border-t-0 first:pt-0"
            >
              <div className="mb-6 inline-flex rounded-full border border-[#0a3570] bg-[#e7ddc9] px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#0a3570]">
                {section.title}
              </div>

              <div className="space-y-4">
                {section.items.map((item) => {
                  const itemKey = `${section.title}:${item.question}`;
                  const isOpen = Boolean(openItems[itemKey]);

                  return (
                    <article
                      key={item.question}
                      className="overflow-hidden rounded-[28px] border border-[#c9b9a5] bg-[#fbf7f1] shadow-[0_6px_18px_rgba(10,27,63,0.06)]"
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(itemKey)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-lg font-semibold text-[#1d2330] sm:px-8 sm:text-xl"
                      >
                        <span>{item.question}</span>
                        <svg
                          viewBox="0 0 24 24"
                          className={`h-6 w-6 shrink-0 text-[#7e776b] transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          fill="currentColor"
                        >
                          <path d="M7 10l5 7 5-7H7Z" />
                        </svg>
                      </button>

                      {isOpen ? <FAQAnswer blocks={item.answer} /> : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
