"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
// Local draft fields for the MVP profile editor.
type ProfileDraft = {
  name: string;
  email: string;
  phone: string;
};
// Default values before session data arrives.
const emptyDraft: ProfileDraft = {
  name: "",
  email: "",
  phone: "",
};

export default function ProfilePage() {
  // Draft state is editable and stored locally for now.
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  // Loading gate while session data is fetched.
  const [loading, setLoading] = useState(true);
  // UI-only save status for MVP.
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    let isMounted = true;

    // Pull any locally saved draft to seed the form.
    const loadDraft = () => {
      try {
        const stored = localStorage.getItem("profileDraft");
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<ProfileDraft>;
          return {
            ...emptyDraft,
            ...parsed,
          };
        }
      } catch {
        return emptyDraft;
      }
      return emptyDraft;
    };

    // Fetch signed-in user data to prefill name/email.
    async function loadSession() {
      const localDraft = loadDraft();
      if (!isMounted) return;

      try {
        const sessionToken = localStorage.getItem("sessionToken");
        const res = await fetch("/api/auth/session", {
          method: "GET",
          headers: sessionToken
            ? {
                Authorization: `Bearer ${sessionToken}`,
              }
            : {},
        });

        if (res.ok) {
          const data = await res.json().catch(() => null);
          const sessionName = data?.user?.userName || "";
          const sessionEmail = data?.user?.email || "";
          if (isMounted) {
            setDraft({
              name: localDraft.name || sessionName,
              email: localDraft.email || sessionEmail,
              phone: localDraft.phone || "",
            });
          }
        } else if (isMounted) {
          setDraft(localDraft);
        }
      } catch {
        if (isMounted) {
          setDraft(localDraft);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Button label depends on save state.
  const isSaving = saveStatus === "saving";
  const saveLabel = useMemo(() => {
    if (saveStatus === "saving") return "Saving...";
    if (saveStatus === "saved") return "Saved";
    return "Save changes";
  }, [saveStatus]);

  // Store the draft locally (no backend persistence yet).
  const handleSave = () => {
    setSaveStatus("saving");
    try {
      localStorage.setItem("profileDraft", JSON.stringify(draft));
    } catch {
      // ignore storage failures for MVP
    } finally {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-6 text-sm text-[#6b5f52]">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5f52]">
          Account
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Profile</h1>
        <p className="mt-2 text-sm text-[#6b5f52]">
          Update your name and contact details.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-6">
            <h2 className="text-lg font-semibold text-[#0a3570]">Bio / Profile</h2>
            <p className="mt-2 text-sm text-[#6b5f52]">
              Name shown in your account and across WintRides.
            </p>
            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">
                Username
              </label>
              <input
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-[#c9b9a3] bg-white px-4 py-3 text-sm text-[#0a1b3f] focus:border-[#0a3570] focus:outline-none"
                placeholder="Add your name"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-6">
            <h2 className="text-lg font-semibold text-[#0a3570]">Contact details</h2>
            <p className="mt-2 text-sm text-[#6b5f52]">
              Phone number is optional for now.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">
                  Phone number
                </label>
                <input
                  value={draft.phone}
                  onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[#c9b9a3] bg-white px-4 py-3 text-sm text-[#0a1b3f] focus:border-[#0a3570] focus:outline-none"
                  placeholder="Add phone number"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">
                  Email address
                </label>
                <input
                  type="email"
                  value={draft.email}
                  readOnly
                  className="mt-2 w-full rounded-xl border border-[#c9b9a3] bg-[#f5efe6] px-4 py-3 text-sm text-[#0a1b3f] opacity-80"
                />
                <Link
                  href="/in-progress"
                  className="mt-2 inline-flex items-center text-xs font-semibold uppercase tracking-[0.18em] text-[#6b5f52] opacity-60"
                  aria-disabled="true"
                >
                  Change email (coming soon)
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#0a3570] bg-white/80 p-6">
            <h2 className="text-lg font-semibold text-[#0a3570]">Security</h2>
            <p className="mt-2 text-sm text-[#6b5f52]">
              Resetting your password will take you to the in-progress flow for now.
            </p>
            <Link
              href="/in-progress"
              className="mt-4 inline-flex items-center justify-center rounded-full border border-[#0a3570] bg-[#0a3570] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#092a59]"
            >
              Reset password
            </Link>
          </div>

          <div className="rounded-2xl border border-[#0a3570] bg-[#f6efe6] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">
              Save changes
            </h2>
            <p className="mt-2 text-sm text-[#6b5f52]">
              Changes are saved locally for now.
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[#0a3570] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a3570] transition hover:bg-[#e9dcc9] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saveLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
