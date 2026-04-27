"use client";

import { useEffect, useMemo, useState } from "react";

/* user's profile information */
type ProfileDraft = {
  legalName: string;
  userName: string;
  email: string;
};

type EditableField = "legalName" | "userName";
type SaveState = "idle" | "saving" | "saved" | "error";

const emptyDraft: ProfileDraft = {
  legalName: "",
  userName: "",
  email: "",
};

/* for now, initials is used in place of what should be the user's photo */
function getInitials(name: string, fallback: string) {
  const source = name.trim() || fallback.trim();
  if (!source) return "WR";

  const letters = source
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return letters || "WR";
}

/* eye-icon behaviour for password and email viewing */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return crossed ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a3 3 0 0 0 4.1 4.1" />
      <path d="M9.4 5.5A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7a21.7 21.7 0 0 1-5 5.8" />
      <path d="M6.6 6.7C3.8 8.6 2 12 2 12s4 7 10 7a10.8 10.8 0 0 0 4.2-.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* pencil icon behaviour to show field is editable */
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m4 20 4.5-1 9.7-9.7a1.8 1.8 0 0 0 0-2.6l-.9-.9a1.8 1.8 0 0 0-2.6 0L5 15.5 4 20Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

export default function ProfilePage() {
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [sessionUserName, setSessionUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let ignore = false;

    // Drivers use legalName when present; riders fall back to their username
    // until a shared profile-name field exists for all users.
    function loadStoredDraft() {
      try {
        const stored = localStorage.getItem("accountProfileDraft");
        if (!stored) return emptyDraft;

        const parsed = JSON.parse(stored) as Partial<ProfileDraft>;
        return {
          ...emptyDraft,
          ...parsed,
        };
      } catch {
        return emptyDraft;
      }
    }

    async function loadProfile() {
      const localDraft = loadStoredDraft();

      try {
        const sessionToken = localStorage.getItem("sessionToken");
        const response = await fetch("/api/auth/session", {
          headers: sessionToken
            ? {
                Authorization: `Bearer ${sessionToken}`,
              }
            : {},
        });

        if (!response.ok) {
          throw new Error("Unable to load profile.");
        }

        const data = await response.json().catch(() => null);
        if (ignore) return;

        const nextLegalName =
          localDraft.legalName ||
          data?.user?.driverLegalName ||
          data?.user?.userName ||
          "";
        const nextUserName = data?.user?.userName || localDraft.userName || "";
        const nextEmail = data?.user?.email || localDraft.email || "";

        setSessionUserName(nextUserName);
        setDraft({
          legalName: nextLegalName,
          userName: nextUserName,
          email: nextEmail,
        });
      } catch {
        if (!ignore) {
          setDraft(localDraft);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, []);

  const profileInitials = useMemo(
    () => getInitials(draft.legalName, draft.userName),
    [draft.legalName, draft.userName]
  );

  const saveLabel = useMemo(() => {
    if (saveState === "saving") return "Saving...";
    if (saveState === "saved") return "Saved";
    if (saveState === "error") return "Try again";
    return "Save changes";
  }, [saveState]);

  const passwordValue = showPassword
    ? "Stored securely. Reset required to change."
    : "••••••••••";
  const emailValue = showEmail ? draft.email : "••••••••••";

  function toggleField(field: EditableField) {
    setActiveField((current) => (current === field ? null : field));
  }

  // Persist username to the database; keep name locally until profile schema
  // supports a shared editable name field for all users.
  async function handleSave() {
    setSaveState("saving");
    setSaveError("");

    try {
      localStorage.setItem("accountProfileDraft", JSON.stringify(draft));
    } catch {
      // Storage failure should not block database-backed username updates.
    }

    try {
      const normalizedUserName = draft.userName.trim();
      if (normalizedUserName && normalizedUserName !== sessionUserName) {
        const sessionToken = localStorage.getItem("sessionToken");
        const response = await fetch("/api/auth/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          },
          body: JSON.stringify({
            userName: normalizedUserName,
          }),
        });

        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error || "Unable to save username.");
        }

        setSessionUserName(body?.user?.userName || normalizedUserName);
        setDraft((current) => ({
          ...current,
          userName: body?.user?.userName || normalizedUserName,
        }));
      }

      setActiveField(null);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save profile.";
      setSaveError(message);
      setSaveState("error");
    }
  }

  if (loading) {
    return (
      <div className="surface-panel rounded-2xl border-dashed p-6 text-sm text-[var(--muted-foreground)]">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">
          Account
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Profile</h1>
        <p className="text-muted mt-2 text-sm">
          Update your personal information. Email changes stay disabled until the verification flow is built.
        </p>
      </header>

      <section className="surface-card overflow-hidden rounded-[32px]">
        <div className="border-b border-[var(--border)] px-8 py-6">
          <p className="eyebrow">
            Bio + Personal Information
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--primary)]">
            Update your personal information
          </h2>
        </div>

        <div className="grid gap-8 px-8 py-8 lg:grid-cols-[260px_1fr]">
          <aside className="surface-panel flex flex-col items-center justify-start rounded-[28px] px-6 py-8 text-center">
            <div className="grid h-40 w-40 place-items-center rounded-full border-2 border-[var(--primary)] bg-[var(--background)] text-4xl font-semibold text-[var(--primary)]">
              {profileInitials}
            </div>
            <p className="mt-5 text-xl font-semibold text-[var(--foreground)]">
              {draft.legalName || "Name"}
            </p>
            <p className="text-muted mt-1 text-sm">
              @{draft.userName || "username"}
            </p>
            <p className="text-muted mt-4 text-xs uppercase tracking-[0.2em]">
              Photo upload coming later
            </p>
          </aside>

          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="surface-panel rounded-[24px] p-6">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b5f52]">
                    Name
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleField("legalName")}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7cab9] bg-[#f6efe6] text-[#6b5f52] transition hover:border-[#0a3570] hover:text-[#0a3570]"
                    aria-label={activeField === "legalName" ? "Stop editing name" : "Edit name"}
                  >
                    <PencilIcon />
                  </button>
                </div>
                <input
                  value={draft.legalName}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      legalName: event.target.value,
                    }))
                  }
                  readOnly={activeField !== "legalName"}
                  className={`mt-3 w-full rounded-2xl border px-4 py-3 text-sm text-[#0a1b3f] focus:border-[#0a3570] focus:outline-none ${
                    activeField === "legalName"
                      ? "border-[#c9b9a3] bg-white"
                      : "border-[#d7cab9] bg-[#f6efe6] opacity-85"
                  }`}
                  placeholder="Add your name"
                />
              </div>

              <div className="surface-panel rounded-[24px] p-6">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b5f52]">
                    Username
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleField("userName")}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7cab9] bg-[#f6efe6] text-[#6b5f52] transition hover:border-[#0a3570] hover:text-[#0a3570]"
                    aria-label={activeField === "userName" ? "Stop editing username" : "Edit username"}
                  >
                    <PencilIcon />
                  </button>
                </div>
                <input
                  value={draft.userName}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      userName: event.target.value,
                    }))
                  }
                  readOnly={activeField !== "userName"}
                  className={`mt-3 w-full rounded-2xl border px-4 py-3 text-sm text-[#0a1b3f] focus:border-[#0a3570] focus:outline-none ${
                    activeField === "userName"
                      ? "border-[#c9b9a3] bg-white"
                      : "border-[#d7cab9] bg-[#f6efe6] opacity-85"
                  }`}
                  placeholder="Add username"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="surface-panel rounded-[24px] p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-full">
                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b5f52]">
                      Email
                    </label>
                    <input
                      type="text"
                      value={emailValue}
                      readOnly
                      className="mt-3 w-full rounded-2xl border border-[#d7cab9] bg-[#f6efe6] px-4 py-3 text-sm text-[#0a1b3f] opacity-85"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmail((current) => !current)}
                    className="mt-8 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7cab9] bg-[#f6efe6] text-[#8a7c6f] transition hover:border-[#0a3570] hover:text-[#0a3570]"
                    aria-label={showEmail ? "Hide email" : "Show email"}
                  >
                    <EyeIcon crossed={showEmail} />
                  </button>
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-5 inline-flex cursor-not-allowed items-center rounded-full border border-[#d7cab9] bg-[#ece2d5] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7c6f] opacity-80"
                >
                  Change email address
                </button>
              </div>

              <div className="surface-panel rounded-[24px] p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-full">
                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b5f52]">
                      Password
                    </label>
                    <input
                      type="text"
                      value={passwordValue}
                      readOnly
                      className="mt-3 w-full rounded-2xl border border-[#d7cab9] bg-[#f6efe6] px-4 py-3 text-sm text-[#0a1b3f] opacity-85"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="mt-8 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7cab9] bg-[#f6efe6] text-[#8a7c6f] transition hover:border-[#0a3570] hover:text-[#0a3570]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon crossed={showPassword} />
                  </button>
                </div>
              </div>
            </div>

            <div className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-[24px] p-5">
              <div className="space-y-1">
                <p className="text-muted text-sm">
                  Username changes save to the database. Name remains local until a shared profile-name field is added.
                </p>
                {saveError ? (
                  <p className="text-sm text-[#b42318]">{saveError}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState === "saving"}
                className="btn-primary min-w-[170px] px-5 py-3 text-xs uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saveLabel}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
