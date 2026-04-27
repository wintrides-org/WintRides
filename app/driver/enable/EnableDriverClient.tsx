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
import {
  US_STATE_OPTIONS,
  validateDriverLicenseInput,
} from "@/lib/licenseValidation";

const displayFont = { className: "font-heading" };

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
  const [updateCheck, setUpdateCheck] = useState<"idle" | "checking" | "allowed" | "denied">(
    "idle"
  );
  const [updateMessage, setUpdateMessage] = useState("");

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
        Authorization: `Bearer ${sessionToken}`,
      },
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
          setUpdateMessage(
            "Driver capability is not enabled yet. Please become a driver first."
          );
          return;
        }
        setUpdateCheck("allowed");
      })
      .catch((error: unknown) => {
        setUpdateCheck("denied");
        setUpdateMessage(
          error instanceof Error ? error.message : "Unable to verify driver status."
        );
      });
  }, [isUpdate]);

  function validateForm(): boolean {
    const next = validateDriverLicenseInput({
      legalName,
      licenseNumber,
      licenseExpirationDate,
      issuingState,
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  }

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
      const sessionToken = localStorage.getItem("sessionToken");
      if (!sessionToken) {
        throw new Error("Please sign in to become a driver.");
      }

      const endpoint = isUpdate ? "/api/auth/driver/update" : "/api/auth/driver/enable";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          legalName: legalName.trim(),
          licenseNumber: licenseNumber.trim(),
          licenseExpirationDate,
          issuingState,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to enable driver capability");
      }

      await res.json();
      setSubmitSuccess(true);

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (e: unknown) {
      setSubmitError(
        e instanceof Error ? e.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell p-6">
      <div className="mx-auto max-w-xl">
        <Link href="/dashboard" className="icon-button h-12 w-12" aria-label="Back to dashboard">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className={`${displayFont.className} mt-6 text-2xl font-semibold`}>
          {isUpdate ? "Update License Details" : "Become a Driver"}
        </h1>
        <p className="text-muted mt-1 text-sm">
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
                className="app-input rounded-xl p-3"
                disabled={submitting || updateCheck === "checking"}
              />
              {errors.legalName ? (
                <p className="text-sm text-red-600">{errors.legalName}</p>
              ) : (
                <p className="text-muted text-xs">
                  This must match the name on your driver&apos;s license.
                </p>
              )}
            </div>

            <div className="grid gap-1">
              <label htmlFor="issuingState" className="text-sm font-medium">
                Issuing State <span className="text-red-600">*</span>
              </label>
              <select
                id="issuingState"
                value={issuingState}
                onChange={(e) => setIssuingState(e.target.value)}
                className="app-input rounded-xl p-3 text-sm"
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
                <p className="text-muted text-xs">
                  Choose the issuing state shown on your license.
                </p>
              )}
            </div>

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
                className="app-input rounded-xl p-3"
                disabled={submitting || updateCheck === "checking"}
                required
              />
              {errors.licenseNumber ? (
                <p className="text-sm text-red-600">{errors.licenseNumber}</p>
              ) : (
                <p className="text-muted text-xs">
                  Must match the format rules for the selected state.
                </p>
              )}
            </div>

            <div className="grid gap-1">
              <label htmlFor="licenseExpirationDate" className="text-sm font-medium">
                License Expiration Date <span className="text-red-600">*</span>
              </label>
              <input
                id="licenseExpirationDate"
                type="date"
                value={licenseExpirationDate}
                onChange={(e) => setLicenseExpirationDate(e.target.value)}
                className="app-input rounded-xl p-3"
                disabled={submitting || updateCheck === "checking"}
                required
              />
              {errors.licenseExpirationDate ? (
                <p className="text-sm text-red-600">{errors.licenseExpirationDate}</p>
              ) : (
                <p className="text-muted text-xs">Must be at least 7 days in the future.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || updateCheck === "checking"}
              className="btn-primary mt-4 px-4 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Submitting..."
                : isUpdate
                  ? "Update License Details"
                  : "Enable Driver Capability"}
            </button>

            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {submitError}{" "}
                <Link href="/signin?next=/driver/enable" className="underline">
                  Sign in
                </Link>
                .
              </div>
            )}

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
