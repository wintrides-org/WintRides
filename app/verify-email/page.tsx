/**
 * Email Verification Page
 * 
 * Handles email verification via verification token
 * 
 * FLOW:
 * 1. User clicks verification link from email (contains token)
 * 2. Page extracts token from URL query parameter
 * 3. Automatically calls verification API
 * 4. Shows success/error state
 * 5. Redirects to sign in page on success
 * 
 * STATES:
 * - loading: Verifying token
 * - success: Email verified successfully
 * - error: Invalid/expired token
 * - pending: No token provided, waiting for email
 * 
 * MVP:
 *   - Token in URL query parameter
 *   - Automatic verification on page load
 * 
 * Production:
 *   - Consider using POST instead of GET for security
 *   - Add CSRF protection
 *   - Better error messages
 *   - Resend verification email option
 *   - Token expiration handling
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "pending">("loading");
  const [message, setMessage] = useState("");
  const [verifying, setVerifying] = useState(false);
  const lastVerifiedToken = useRef<string | null>(null);

  /**
   * Verify email with token
   * 
   * Calls verification API endpoint
   * Updates UI state based on result
   * 
   * MVP: Simple API call
   * Production: Add retry logic, better error handling
   */
  async function verifyEmail(verificationToken: string) {
    setVerifying(true);
    try {
      // Call verification API
      // MVP: GET request with token in query parameter
      // Production: Consider POST for better security
      const res = await fetch(`/api/auth/verify-email?token=${verificationToken}`);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verification failed");
      }

      const data = await res.json();
      setStatus("success");
      setMessage("Email verified successfully! You can now sign in.");

      // Redirect to sign in after 3 seconds
      // After sign in, user will be redirected to dashboard
      setTimeout(() => {
        router.push("/signin");
      }, 3000);
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message || "Failed to verify email. The link may be invalid or expired.");
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    // If token is provided, automatically verify
    if (token) {
      if (lastVerifiedToken.current === token) {
        return;
      }
      lastVerifiedToken.current = token;
      verifyEmail(token);
    } else if (email) {
      // If only email is provided, show pending state
      setStatus("pending");
      setMessage("Please check your email for the verification link.");
    } else {
      // No token or email, show error
      setStatus("error");
      setMessage("Invalid verification link. Please check your email for the correct link.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, email]);

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold">Verify Your Email</h1>

      <div className="mt-6">
        {status === "loading" && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center">
            <p className="text-neutral-600">Verifying your email...</p>
          </div>
        )}

        {status === "pending" && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <p className="text-blue-800 mb-4">{message}</p>
            {email && (
              <p className="text-sm text-blue-700">
                We sent a verification link to <strong>{email}</strong>
              </p>
            )}
            <p className="mt-4 text-sm text-blue-700">
              Didn't receive the email? Check your spam folder or{" "}
              <Link href="/register" className="font-medium underline">
                try registering again
              </Link>
              .
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6">
            <p className="text-green-800 font-medium mb-2">✓ Email Verified!</p>
            <p className="text-green-700 text-sm">{message}</p>
            <p className="mt-4 text-sm text-green-700">
              Redirecting to sign in page...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-red-800 font-medium mb-2">Verification Failed</p>
            <p className="text-red-700 text-sm mb-4">{message}</p>
            <div className="flex flex-col gap-2">
              <Link
                href="/signin"
                className="rounded-xl bg-black px-4 py-2 text-center font-medium text-white hover:bg-neutral-800"
              >
                Go to Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-xl border border-neutral-300 px-4 py-2 text-center font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Register Again
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

