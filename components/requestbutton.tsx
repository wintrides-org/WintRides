"use client"; // makes requestbutton.tsx a client component. Tells Next.jst the component runs in  the browser

/*
imports necessary objects
*/

// useState: lets us store component state (is the modal open or close?)
// useMemo: lets us define data once without recreating it on every render
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation"; // allows navigation to another page
import type { RequestType } from "@/types/request"; // imports teh request types we defined in types/request

/* 
defines what ONE request option looks like in the UI
*/
type Option = {
  type: RequestType; // IMMEDIATE | SCHEDULED | GROUP
  title: string; // Text shown to the user
  description: string; // Small explanation under the title 
  href: string; // Where to navigate when selected
};


export default function RequestButton() {
  const router = useRouter(); // define a router object for navigation
  const [open, setOpen] = useState(false); // contols whether the modal is visible 

  // Defines the three request options shown in the modal
  // useMemo ensures this array is not created on every render
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

  // Called when the user clicks one of the options
  function onSelect(option: Option) {
    setOpen(false); // Close the modal
    router.push(option.href); // Navigate to the correct page
  }

  return (
    <>
      {/* The main Request button*/}
      <button
        type="button"
        onClick={() => setOpen(true)} // Open modal
        className="rounded-xl px-4 py-2 font-medium shadow-sm border border-neutral-200 bg-white hover:bg-neutral-50"
      >
        Request
      </button>
      
      {/* Only show the modal if open === True */}
      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Request options"
        >
          {/* Background overlay. Clicking it closes the modal */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-label="Close modal"
          />

          {/* Modal container */}
          <div className="absolute left-1/2 top-1/2 w-[min(560px,92vw)] -translate-x-1/2
                         -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Choose request type</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Select how you want to request a ride.
                </p>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Request options */}
            <div className="mt-4 grid gap-3">
              {options.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => onSelect(opt)}
                  className="text-left rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
                >
                  <div className="font-medium">{opt.title}</div>
                  <div className="mt-1 text-sm text-neutral-600">
                    {opt.description}
                  </div>
                </button>
              ))}
            </div>
            
            {/* Footer cancel button */}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2 text-sm border border-neutral-200 hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
