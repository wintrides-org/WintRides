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

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import BrandMark from "@/components/BrandMark";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsWindow = Window & {
  google?: {
    accounts?: {
      id?: {
        initialize: (config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
        }) => void;
        renderButton: (
          element: HTMLElement,
          options: {
            theme: string;
            size: string;
            text: string;
            shape: string;
          }
        ) => void;
      };
    };
  };
};

export default function RegisterPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null); // Hold the GIS button mount node.
  
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [wantsToDrive, setWantsToDrive] = useState(false);

  // Legacy file upload state (deprecated in manual-entry flow).
  // const [licenseFile, setLicenseFile] = useState<File | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [userNameError, setUserNameError] = useState("");
  const [userNameChecking, setUserNameChecking] = useState(false);

  useEffect(() => {
    let ignore = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // empty entries will be handled when the user tries to submit
    // validateForm() will show the error. While typing, ignore it
    if (!userName.trim()) {
      setUserNameError("");
      setUserNameChecking(false);
      return;
    }

    setUserNameChecking(true);
    timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/username-available?userName=${encodeURIComponent(userName)}`
        );
        const data = await res.json().catch(() => null);
        if (ignore) return;
        if (data?.available) {
          setUserNameError("");
        } else {
          setUserNameError(
            data?.error ||
              "This username has been taken. Choose a new username or sign in if you already created an account"
          );
        }
      } catch {
        if (!ignore) {
          setUserNameError("Unable to check username right now.");
        }
      } finally {
        if (!ignore) {
          setUserNameChecking(false);
        }
      }
    }, 400);

    return () => {
      ignore = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [userName]);
  const [googleReady, setGoogleReady] = useState(false); // Track GIS script readiness.
  const [googleError, setGoogleError] = useState(""); // Track Google sign-in errors.

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID; // Read the Google client ID.

  useEffect(() => { // Handle client-side navigation when GIS is already loaded.
    if ((window as GoogleAccountsWindow)?.google?.accounts?.id) { // Detect the loaded GIS script.
      setGoogleReady(true); // Mark Google as ready without waiting for onLoad.
    }
  }, []);

  async function handleGoogleCredentialResponse(response: GoogleCredentialResponse) { // Handle GIS credential response.
    setGoogleError(""); // Clear any previous Google error message.
    const idToken = response?.credential; // Extract the ID token from the response.
    if (!idToken) { // Guard against missing credentials.
      setGoogleError("Google sign-in failed. Please try again."); // Show a user-friendly error.
      return; // Stop processing without a token.
    }

    try { // Wrap the request in a try/catch for errors.
      const res = await fetch("/api/auth/google", { // Exchange the ID token for a session.
        method: "POST", // Use POST for token exchange.
        headers: { "Content-Type": "application/json" }, // Send JSON payload.
        body: JSON.stringify({ idToken }) // Include the ID token in the request body.
      });

      const data = await res.json(); // Parse the server response.
      if (!res.ok) { // Handle non-200 responses.
        const message = String(data?.error || "Google sign-in failed"); // Normalize the backend error message.
        if (message.toLowerCase().includes("campus")) { // Translate domain errors into a friendlier message.
          setGoogleError("This app currently supports Smith emails only. Please use your smith.edu account."); // Show a clearer domain error.
          return; // Stop here after showing the message.
        }
        throw new Error(message); // Surface other errors.
      }

      router.push("/dashboard"); // Redirect to the dashboard on success.
    } catch (e: unknown) { // Catch and display errors from the exchange.
      setGoogleError(e instanceof Error ? e.message : "Google sign-in failed"); // Show a fallback error message.
    }
  }

  useEffect(() => { // Initialize GIS once the script is loaded.
    if (!googleReady) { // Exit early until the GIS script is ready.
      return; // Prevent initializing before the script loads.
    }
    if (!googleClientId) { // Ensure the client ID is configured.
      setGoogleError("Google sign-in is not configured."); // Show a configuration error.
      return; // Stop initialization without a client ID.
    }

    const google = (window as GoogleAccountsWindow)?.google; // Access the global GIS object.
    if (!google?.accounts?.id || !googleButtonRef.current) { // Verify GIS and the button ref.
      return; // Exit if the GIS library or button ref is missing.
    }

    google.accounts.id.initialize({ // Initialize the GIS client.
      client_id: googleClientId, // Provide the OAuth client ID.
      callback: handleGoogleCredentialResponse // Handle credential responses.
    });

    googleButtonRef.current.innerHTML = ""; // Clear any previous button renders.
    google.accounts.id.renderButton(googleButtonRef.current, { // Render the Google sign-in button.
      theme: "outline", // Use the outline button style.
      size: "large", // Render a large button.
      text: "signin_with", // Use the "Sign in with Google" text.
      shape: "pill" // Use a pill-shaped button.
    });
  }, [googleReady, googleClientId]); // Re-run when the script or config changes.

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
   * Production: Add more robust server-side validation, password strength checking
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

    // Username validation here only checks if user entered a value
    // instead of re-checking the database for uniqueness (auth/username-available did that already)
    if (!userName.trim()) {
      next.userName = "Username is required";
    } else if (userNameError) {
      next.userName = userNameError;
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

    if (userNameChecking) {
      setSubmitError("Please wait for username validation to finish.");
      return;
    }

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
        userName,
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
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell min-h-screen px-6 py-10">
      <Script
        src="https://accounts.google.com/gsi/client"
        async
        defer
        onLoad={() => setGoogleReady(true)}
      />
      <div className="mx-auto max-w-xl">
      <div className="surface-card rounded-[32px] p-8">
      <div className="flex items-center justify-between gap-4">
        <BrandMark />
        <Link href="/" className="btn-ghost rounded-full px-4 py-2 text-sm font-semibold">
          Back
        </Link>
      </div>
      <h1 className="font-heading mt-8 text-4xl">
        Create account
      </h1>
      <p className="text-muted mt-2 text-sm">
        Sign up with your campus email to join WintRides.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-4">
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
            className="app-input rounded-2xl p-3"
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

        {/* Username */}
        <div className="grid gap-1">
          <label htmlFor="userName" className="text-sm font-medium">
            Username
          </label>
          <input
            id="userName"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter a username"
            className="app-input rounded-2xl p-3"
            disabled={submitting}
          />
          {errors.userName || userNameError ? (
            <p className="text-sm text-red-600">
              {errors.userName || userNameError}
            </p>
          ) : (
            <p className="text-xs text-neutral-500">
              3-15 characters, starts with 3 letters, and can include _, @, -.
            </p>
          )}
          {userNameChecking ? (
            <p className="text-xs text-neutral-500">Checking availability...</p>
          ) : null}
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
            className="app-input rounded-2xl p-3"
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
            className="app-input rounded-2xl p-3"
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
              className="rounded border-[var(--border-strong)]"
              disabled={submitting}
            />
            <span className="text-sm font-medium">
              I&apos;m also available to drive
            </span>
          </label>
          <p className="mt-1 ml-6 text-xs text-neutral-500">
            You can toggle this later in your profile settings
          </p>
        </div>

        {/* Driver intent */}
        {wantsToDrive && (
          <div className="ml-6 grid gap-4 border-l-2 border-neutral-200 pl-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-sm text-[var(--foreground)]">
              Driver details are collected after email verification. We will guide you to the
              dedicated driver form once your account is created.
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary mt-4 px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create account"}
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
          <Link href="/signin" className="font-medium text-[var(--primary)] underline">
            Sign in
          </Link>
        </p>

        <div className="mt-4 grid gap-3">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-muted text-xs">or</span>
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <div ref={googleButtonRef} className="flex justify-center" />
          {googleError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {googleError}
            </div>
          )}
        </div>
      </form>
      </div>
      </div>
    </main>
  );
}
