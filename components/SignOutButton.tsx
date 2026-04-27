"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SignOutButtonProps = {
  className?: string;
  label?: string;
};

export default function SignOutButton({
  className = "",
  label = "Sign out",
}: SignOutButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // End the current server session and clear the client-side token copy used
  // by authenticated fetches before returning the user to the landing page.
  async function handleSignOut() {
    setSubmitting(true);
    setError("");

    try {
      const sessionToken = localStorage.getItem("sessionToken");
      const res = await fetch("/api/auth/signout", {
        method: "POST",
        headers: sessionToken
          ? {
              Authorization: `Bearer ${sessionToken}`,
            }
          : {},
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || "Failed to sign out.");
      }

      // Clear the client-side token copy used by MVP authenticated fetches.
      localStorage.removeItem("sessionToken");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign out.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={submitting}
        className={className}
      >
        {submitting ? "Signing out..." : label}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
