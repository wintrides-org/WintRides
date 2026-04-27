"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RequestType } from "@/types/request";

type Option = {
  type: RequestType;
  title: string;
  description: string;
  href: string;
};

type RequestButtonProps = {
  label?: string;
  className?: string;
  unstyled?: boolean;
};

export default function RequestButton({
  label = "Request",
  className = "",
  unstyled = false,
}: RequestButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localOpen, setLocalOpen] = useState(false);
  const requestOptionsOpen = searchParams.get("requestOptions") === "1";
  const open = localOpen || requestOptionsOpen;

  const options: Option[] = useMemo(
    () => [
      {
        type: "IMMEDIATE",
        title: "Request now",
        description: "Get a ride as soon as possible.",
        href: "/request/immediate",
      },
      {
        type: "SCHEDULED",
        title: "Request ahead",
        description: "Schedule a ride for later (airport, planned trips).",
        href: "/request/scheduled",
      },
      {
        type: "GROUP",
        title: "Group request",
        description: "For org events; coordinate multiple drivers/vehicles.",
        href: "/request/group",
      },
    ],
    []
  );

  function onSelect(option: Option) {
    setLocalOpen(false);
    router.push(option.href);
  }

  function setModalState(nextOpen: boolean) {
    setLocalOpen(nextOpen);

    const params = new URLSearchParams(searchParams.toString());
    if (nextOpen) {
      params.set("requestOptions", "1");
    } else {
      params.delete("requestOptions");
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalState(true)}
        className={
          unstyled
            ? className
            : `btn-secondary rounded-xl px-4 py-2 font-medium ${className}`.trim()
        }
      >
        {label}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Request options"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setModalState(false)}
            aria-label="Close modal"
          />

          <div className="surface-card absolute left-1/2 top-1/2 w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 text-[var(--foreground)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Choose request type</h2>
                <p className="text-muted mt-1 text-sm">
                  Select how you want to request a ride.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalState(false)}
                className="btn-ghost rounded-lg px-2 py-1 text-sm text-muted"
                aria-label="Close modal"
              >
                x
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {options.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => onSelect(opt)}
                  className="surface-panel rounded-xl p-4 text-left transition hover:bg-[var(--surface)]"
                >
                  <div className="font-medium">{opt.title}</div>
                  <div className="text-muted mt-1 text-sm">{opt.description}</div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setModalState(false)}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
