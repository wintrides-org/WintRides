/**
 * Registration Page
 * 
 * User registration form with optional driver intent
 * 
 * FLOW:
 * 1. User enters email, password, and optionally enables driver capability
 * 2. If driver intent selected: record intent and route to driver form after verification
 * 3. Client-side validation
 * 4. Submit to /api/auth/register
 * 5. Redirect to email verification page (with optional driver form redirect)
 * 
 * MVP:
 *   - Driver intent captured at signup
 *   - Basic client-side validation
 *   - Verification token returned in response (for dev testing)
 * 
 * Production:
 *   - Validate license details against authoritative sources
 *   - More robust client-side validation
 *   - Password strength meter
 *   - Real-time email domain validation
 *   - CAPTCHA for bot protection
 *   - Better error handling and user feedback
 *   - Accessibility improvements (ARIA labels, keyboard navigation)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [wantsToDrive, setWantsToDrive] = useState(false);

  // Legacy file upload state (deprecated in manual-entry flow).
  // const [licenseFile, setLicenseFile] = useState<File | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  /**
   * Client-side form validation
   * 
   * Validates:
   * - Email format and campus domain
   * - Password length
   * - Password confirmation match
   * - Driver intent (if wantsToDrive is true)
   * 
   * MVP: Basic validation
   * Production: Add more robust validation, password strength checking
   */
  function validateForm(): boolean {
    const next: Record<string, string> = {};

    // Email validation - must be from valid campus domain
    if (!email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Please enter a valid email address";
    } else {
      const domain = email.split("@")[1]?.toLowerCase();
      if (!domain?.endsWith(".edu")) {
        next.email = "Email must be from a valid campus domain (.edu)";   
      }
    }

    // Password validation
    if (!password) {
      next.password = "Password is required";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters long";
    }

    // Confirm password
    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }

    // Driver intent requires no extra fields at signup.
    // Manual license details are collected in the dedicated driver form.

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /**
   * Legacy license upload handler (deprecated in manual-entry flow).
   * This stays commented out to prevent requests for a license upload URL.
   */
  // async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  //   const file = e.target.files?.[0];
  //   if (file) {
  //     const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
  //     if (!validTypes.includes(file.type)) {
  //       setErrors({ ...errors, licenseFile: "Please upload a JPEG, PNG, or PDF file" });
  //       return;
  //     }
  //     if (file.size > 5 * 1024 * 1024) {
  //       setErrors({ ...errors, licenseFile: "File size must be less than 5MB" });
  //       return;
  //     }
  //     setLicenseFile(file);
  //     setErrors({ ...errors, licenseFile: "" });
  //   }
  // }

  /**
   * Handle form submission
   * 
   * FLOW:
   * 1. Prevent default form submission
   * 2. Validate form
   * 3. Submit to registration API
   * 4. Redirect to email verification page (with optional driver form redirect)
   * 
   * MVP: Manual license details are submitted
   * Production: Validate details against authoritative sources
   */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // Legacy license upload conversion (deprecated in manual-entry flow).
      // let licenseUploadUrl: string | undefined;
      // if (licenseFile) {
      //   const reader = new FileReader();
      //   licenseUploadUrl = await new Promise((resolve, reject) => {
      //     reader.onload = () => resolve(reader.result as string);
      //     reader.onerror = reject;
      //     reader.readAsDataURL(licenseFile);
      //   });
      // }

      // Build payload with driver intent only (details collected later).
      const payload = {
        email: email.trim().toLowerCase(),
        password,
        wantsToDrive: wantsToDrive || undefined
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      const data = await res.json();
      setSubmitSuccess(true);

      // Redirect to verification page.
      // If driver intent is selected, include the next step path to the driver form.
      setTimeout(() => {
        const nextParam = wantsToDrive ? "&next=/driver/enable" : "";
        if (data.verificationToken) {
          router.push(`/verify-email?token=${data.verificationToken}${nextParam}`);
        } else {
          router.push("/verify-email?email=" + encodeURIComponent(email) + nextParam);
        }
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
        href="/"
        className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
        aria-label="Back to home"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      <h1 className={`${displayFont.className} mt-6 text-2xl font-semibold`}>
        Create Account
      </h1>
      <p className="mt-1 text-sm text-neutral-600">
        Sign up with your campus email to join WintRides.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        {/* Email */}
        <div className="grid gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Campus Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.name@university.edu"
            className="rounded-xl border p-3"
            disabled={submitting}
          />
          {errors.email ? (
            <p className="text-sm text-red-600">{errors.email}</p>
          ) : (
            <p className="text-xs text-neutral-500">
              Must be a .edu email address 
            </p>
          )}
        </div>

        {/* Password */}
        <div className="grid gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="rounded-xl border p-3"
            disabled={submitting}
          />
          {errors.password ? (
            <p className="text-sm text-red-600">{errors.password}</p>
          ) : null}
        </div>

        {/* Confirm Password */}
        <div className="grid gap-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="rounded-xl border p-3"
            disabled={submitting}
          />
          {errors.confirmPassword ? (
            <p className="text-sm text-red-600">{errors.confirmPassword}</p>
          ) : null}
        </div>

        {/* Driver Option */}
        <div className="mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={wantsToDrive}
              onChange={(e) => setWantsToDrive(e.target.checked)}
              className="rounded border-gray-300"
              disabled={submitting}
            />
            <span className="text-sm font-medium">
              I'm also available to drive
            </span>
          </label>
          <p className="mt-1 ml-6 text-xs text-neutral-500">
            You can toggle this later in your profile settings
          </p>
        </div>

        {/* Driver intent */}
        {wantsToDrive && (
          <div className="ml-6 grid gap-4 border-l-2 border-neutral-200 pl-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Driver details are collected after email verification. We will guide you to the
              dedicated driver form once your account is created.
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-neutral-800 disabled:bg-neutral-400 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating Account..." : "Create Account"}
        </button>

        {/* Error Message */}
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {submitError}
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Account created! Redirecting to email verification...
          </div>
        )}

        {/* Sign In Link */}
        <p className="mt-4 text-center text-sm text-neutral-600">
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-[#2f6db3] underline">
            Sign in
          </Link>
        </p>
      </form>
      </div>
    </main>
  );
}
