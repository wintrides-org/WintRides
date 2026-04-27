"use client";

import Link from "next/link";
import { useState } from "react";

const displayFont = { className: "font-heading" };

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
            text: "WintRides is a centralized ride-sharing platform built for college students on rural and suburban campuses. Think of it as Uber for college campuses: it lets students request, offer, and share rides around campus towns and to key destinations like airports.",
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
              "Riders: students who need reliable, affordable transportation.",
              "Drivers: students who want to earn extra income by offering rides in a safe, familiar environment.",
            ],
          },
        ],
      },
      {
        question: "How does pricing work?",
        answer: [
          {
            type: "paragraph",
            text: "Rides are currently priced at approximately $7 per rider. Pricing is based on the number of riders in a trip: the more people in a single ride, the higher the total cost of a trip.",
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
              "Request a ride: book a dedicated trip to your destination.",
              "Carpool: find other students heading the same way and share the cost.",
            ],
          },
        ],
      },
      {
        question: "Why use WintRides instead of another ride-share app?",
        answer: [
          {
            type: "paragraph",
            text: "WintRides is designed around student needs: reliable scheduled rides, student-friendly pricing, and easy coordination for carpooling with people on your campus.",
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
              "Offer a ride: pick up listed ride requests and earn income.",
              "Carpool: offer spare seats on trips you're already making to monetize rides you'd take anyway.",
            ],
          },
        ],
      },
      {
        question: "Is driving through WintRides safe?",
        answer: [
          {
            type: "paragraph",
            text: "Yes: WintRides operates within a familiar campus community, connecting you with fellow students rather than strangers from the general public.",
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
        question: "I'm testing the driver flow. What should I enter for my license?",
        answer: [
          {
            type: "paragraph",
            text: "Do not use your real license number. Keep the same format, but substitute different numbers in place of your actual digits.",
          },
        ],
      },
      {
        question: "Driver onboarding seems stuck. What do I do?",
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
              'If it is still stuck, go to your Account > Payment page and click the "Review payment setup" button.',
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
    <div className="space-y-4 border-t px-6 pb-6 pt-5 text-sm leading-7 sm:px-8">
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
            <div key={index} className="surface-panel rounded-2xl px-4 py-3 text-muted">
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
              className="font-semibold text-[var(--primary)] underline decoration-[color-mix(in_srgb,var(--primary)_50%,transparent)] underline-offset-4 hover:text-[var(--primary-hover)]"
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

export default function HelpPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  function toggleItem(key: string) {
    setOpenItems((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <header className="app-topbar brand-accent-top flex flex-wrap items-start justify-between gap-6 rounded-[30px] px-5 py-5">
          <div>
            <p className="eyebrow">Support</p>
            <h1 className={`${displayFont.className} mt-2 text-4xl sm:text-5xl`}>WintRides FAQ</h1>
            <p className="text-muted mt-3 max-w-3xl text-base sm:text-lg">
              Reliable, affordable rides for college students on rural and suburban campuses.
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary gap-2 px-4 py-2 text-sm font-semibold">
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
        </header>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title} className="space-y-5">
              <h2 className="eyebrow text-base text-[var(--muted-foreground)]">
                {section.title}
              </h2>

              <div className="space-y-4">
                {section.items.map((item) => {
                  const itemKey = `${section.title}:${item.question}`;
                  const isOpen = Boolean(openItems[itemKey]);

                  return (
                    <article key={item.question} className="surface-card brand-accent-top overflow-hidden rounded-[28px]">
                      <button
                        type="button"
                        onClick={() => toggleItem(itemKey)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-lg font-semibold sm:px-8 sm:text-xl"
                      >
                        <span>{item.question}</span>
                        <svg
                          viewBox="0 0 24 24"
                          className={`text-muted h-6 w-6 shrink-0 transition-transform ${
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
