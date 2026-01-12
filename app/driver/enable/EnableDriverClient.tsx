/**
 * Become a Driver / Update License Page (MVP)
 *
 * Dedicated form to collect manual license details after account creation.
 * Uses session token to guard updates and routes back to dashboard on success.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Playfair_Display, Work_Sans } from "next/font/google";
import {
  US_STATE_OPTIONS,
  validateDriverLicenseInput
} from "@/lib/licenseValidation";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function EnableDriverClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isUpdate = mode === "update";

  const [legalName, setLegalName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpirationDate, setLicenseExpirationDate] = useState("");
  const [issuingState, setIssuingState] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [updateCheck, setUpdateCheck] = useState<"idle" | "checking" | "allowed" | "denied">("idle");
  const [updateMessage, setUpdateMessage] = useState("");

  /**
   * Ensure update mode is only available to users who are already drivers.
   * This uses the session endpoint to confirm driver capability before showing the form.
   */
  useEffect(() => {
    if (!isUpdate) {
      setUpdateCheck("allowed");
      return;
    }

    const sessionToken = localStorage.getItem("sessionToken");
    if (!sessionToken) {
      setUpdateCheck("denied");
      setUpdateMessage("Please sign in to update your license details.");
      return;
    }

    setUpdateCheck("checking");

    fetch("/api/auth/session", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionToken}`
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Unable to verify session.");
        }
        return res.json();
      })
      .then((data) => {
        if (!data?.user?.isDriver) {
          setUpdateCheck("denied");
          setUpdateMessage("Driver capability is not enabled yet. Please become a driver first.");
          return;
        }
        setUpdateCheck("allowed");
      })
      .catch((error) => {
        setUpdateCheck("denied");
        setUpdateMessage(error?.message || "Unable to verify driver status.");
      });
  }, [isUpdate]);

  /**
   * Validate the manual license fields using shared rules.
   * Keeps the client in sync with server-side validation.
   */
  function validateForm(): boolean {
    const next = validateDriverLicenseInput({
      legalName,
      licenseNumber,
      licenseExpirationDate,
      issuingState
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /**
   * Handle form submission to enable or update driver capability.
   * Uses the same form, but switches endpoints based on `mode=update`.
   * Requires an MVP session token in localStorage.
   */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (isUpdate && updateCheck !== "allowed") {
      setSubmitError("Driver capability must be enabled before updating license details.");
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // MVP: session token is stored in localStorage after sign-in.
      const sessionToken = localStorage.getItem("sessionToken");
      if (!sessionToken) {
        throw new Error("Please sign in to become a driver.");
      }

      // Choose the endpoint based on form mode.
      const endpoint = isUpdate ? "/api/auth/driver/update" : "/api/auth/driver/enable";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          legalName: legalName.trim(),
          licenseNumber: licenseNumber.trim(),
          licenseExpirationDate,
          issuingState
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to enable driver capability");
      }

      await res.json();
      setSubmitSuccess(true);

      // Redirect to dashboard after enabling or updating driver capability.
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (e: any) {
      setSubmitError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className={`min-h-screen bg-[#f4ecdf] p-6 text-[#1e3a5f] ${bodyFont.className}`}
    >
      <div className="mx-auto max-w-xl">
      <Link
        href="/dashboard"
        className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
        aria-label="Back to dashboard"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      <h1 className={`${displayFont.className} mt-6 text-2xl font-semibold`}>
        {isUpdate ? "Update License Details" : "Become a Driver"}
      </h1>
      <p className="mt-1 text-sm text-neutral-600">
        {isUpdate
          ? "Update your license details to keep your driver profile current."
          : "Enter your license details to enable driver capability."}
      </p>

      {isUpdate && updateCheck === "denied" ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {updateMessage}{" "}
          <Link href="/driver/enable" className="underline">
            Become a driver
          </Link>
          .
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          {/* Legal Name */}
          <div className="grid gap-1">
            <label htmlFor="legalName" className="text-sm font-medium">
              Legal Name (as on license)
            </label>
            <input
              id="legalName"
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="First Last"
              className="rounded-xl border p-3"
              disabled={submitting || updateCheck === "checking"}
            />
            {errors.legalName ? (
              <p className="text-sm text-red-600">{errors.legalName}</p>
            ) : (
              <p className="text-xs text-neutral-500">
                This must match the name on your driver's license.
              </p>
            )}
          </div>

          {/* Issuing State */}
          <div className="grid gap-1">
            <label htmlFor="issuingState" className="text-sm font-medium">
              Issuing State <span className="text-red-600">*</span>
            </label>
            <select
              id="issuingState"
              value={issuingState}
              onChange={(e) => setIssuingState(e.target.value)}
              className="rounded-xl border p-3 text-sm"
              disabled={submitting || updateCheck === "checking"}
              required
            >
              <option value="">Select a state</option>
              {US_STATE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name} ({option.code})
                </option>
              ))}
            </select>
            {errors.issuingState ? (
              <p className="text-sm text-red-600">{errors.issuingState}</p>
            ) : (
              <p className="text-xs text-neutral-500">
                Choose the issuing state shown on your license.
              </p>
            )}
          </div>

          {/* License Number */}
          <div className="grid gap-1">
            <label htmlFor="licenseNumber" className="text-sm font-medium">
              License Number <span className="text-red-600">*</span>
            </label>
            <input
              id="licenseNumber"
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="Enter your license number"
              className="rounded-xl border p-3"
              disabled={submitting || updateCheck === "checking"}
              required
            />
            {errors.licenseNumber ? (
              <p className="text-sm text-red-600">{errors.licenseNumber}</p>
            ) : (
              <p className="text-xs text-neutral-500">
                Must match the format rules for the selected state.
              </p>
            )}
          </div>

          {/* License Expiration Date */}
          <div className="grid gap-1">
            <label htmlFor="licenseExpirationDate" className="text-sm font-medium">
              License Expiration Date <span className="text-red-600">*</span>
            </label>
            <input
              id="licenseExpirationDate"
              type="date"
              value={licenseExpirationDate}
              onChange={(e) => setLicenseExpirationDate(e.target.value)}
              className="rounded-xl border p-3"
              disabled={submitting || updateCheck === "checking"}
              required
            />
            {errors.licenseExpirationDate ? (
              <p className="text-sm text-red-600">{errors.licenseExpirationDate}</p>
            ) : (
              <p className="text-xs text-neutral-500">
                Must be at least 7 days in the future.
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || updateCheck === "checking"}
            className="mt-4 rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-neutral-800 disabled:bg-neutral-400 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : (isUpdate ? "Update License Details" : "Enable Driver Capability")}
          </button>

          {/* Error Message */}
          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {submitError}{" "}
              <Link href="/signin?next=/driver/enable" className="underline">
                Sign in
              </Link>
              .
            </div>
          )}

          {/* Success Message */}
          {submitSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {isUpdate
                ? "License details updated! Redirecting to your dashboard..."
                : "Driver capability enabled! Redirecting to your dashboard..."}
            </div>
          )}
        </form>
      )}
      </div>
    </main>
  );
}
