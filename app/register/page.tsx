/**
 * Registration Page
 * 
 * User registration form with optional driver signup
 * 
 * FLOW:
 * 1. User enters email, password, and optionally enables driver capability
 * 2. If driver enabled: requires legal name and license upload
 * 3. Client-side validation
 * 4. Convert license file to base64 (MVP) or upload to cloud storage (Production)
 * 5. Submit to /api/auth/register
 * 6. Redirect to email verification page
 * 
 * MVP:
 *   - License file converted to base64 data URL on client
 *   - Basic client-side validation
 *   - Verification token returned in response (for dev testing)
 * 
 * Production:
 *   - Upload license to cloud storage (S3, Cloudinary) before submission
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

export default function RegisterPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [wantsToDrive, setWantsToDrive] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  
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
   * - Driver-specific fields (if wantsToDrive is true)
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

    // Driver-specific validation
    if (wantsToDrive) {
      if (!legalName.trim()) {
        next.legalName = "Legal name is required for driver registration";
      }
      if (!licenseFile) {
        next.licenseFile = "License upload is required for driver registration";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /**
   * Handle license file upload
   * 
   * Validates:
   * - File type (JPEG, PNG, PDF only)
   * - File size (max 5MB)
   * 
   * MVP: Client-side validation only
   * Production: Also validate on server, scan for malware
   */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (images and PDFs only)
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        setErrors({ ...errors, licenseFile: "Please upload a JPEG, PNG, or PDF file" });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, licenseFile: "File size must be less than 5MB" });
        return;
      }
      
      setLicenseFile(file);
      setErrors({ ...errors, licenseFile: "" });
    }
  }

  /**
   * Handle form submission
   * 
   * FLOW:
   * 1. Prevent default form submission
   * 2. Validate form
   * 3. Convert license file to base64 (MVP) or use cloud storage URL (Production)
   * 4. Submit to registration API
   * 5. Redirect to email verification page
   * 
   * MVP: License converted to base64 on client
   * Production: License should already be uploaded to cloud storage, URL provided
   */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // Convert file to base64 for MVP
      // Production: License should already be uploaded to cloud storage (S3, Cloudinary)
      //             and URL should be provided here instead
      let licenseUploadUrl: string | undefined;
      if (licenseFile) {
        const reader = new FileReader();
        licenseUploadUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(licenseFile);
        });
      }

      const payload = {
        email: email.trim().toLowerCase(),
        password,
        wantsToDrive: wantsToDrive || undefined,
        legalName: wantsToDrive ? legalName.trim() : undefined,
        licenseUploadUrl
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

      // Redirect to verification page
      setTimeout(() => {
        if (data.verificationToken) {
          router.push(`/verify-email?token=${data.verificationToken}`);
        } else {
          router.push("/verify-email?email=" + encodeURIComponent(email));
        }
      }, 1500);
    } catch (e: any) {
      setSubmitError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold">Create Account</h1>
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

        {/* Driver-specific fields */}
        {wantsToDrive && (
          <div className="ml-6 grid gap-4 border-l-2 border-neutral-200 pl-4">
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
                disabled={submitting}
              />
              {errors.legalName ? (
                <p className="text-sm text-red-600">{errors.legalName}</p>
              ) : (
                <p className="text-xs text-neutral-500">
                  This will be verified against your license
                </p>
              )}
            </div>

            {/* License Upload */}
            <div className="grid gap-1">
              <label htmlFor="licenseFile" className="text-sm font-medium">
                Driver's License <span className="text-red-600">*</span>
              </label>
              <input
                id="licenseFile"
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleFileChange}
                className="rounded-xl border p-3 text-sm"
                disabled={submitting}
                required
              />
              {errors.licenseFile ? (
                <p className="text-sm text-red-600">{errors.licenseFile}</p>
              ) : (
                <p className="text-xs text-neutral-500">
                  Upload a photo of your driver's license. The name on your license must match the legal name above. (JPEG, PNG, or PDF, max 5MB)
                </p>
              )}
              {licenseFile && (
                <p className="text-xs text-green-600">
                  ✓ {licenseFile.name} selected
                </p>
              )}
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
    </main>
  );
}

