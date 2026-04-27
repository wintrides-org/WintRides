import SignOutButton from "@/components/SignOutButton";

export default function SignOutPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">
          Account
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Sign out</h1>
        <p className="text-muted mt-2 text-sm">
          End the current session on this device.
        </p>
      </header>

      <section className="surface-panel rounded-2xl p-5">
        <h2 className="text-base font-semibold">Sign out action</h2>
        <p className="text-muted mt-2 text-sm">
          This clears your current session and returns you to the landing page.
        </p>
        <div className="mt-4">
          <SignOutButton
            className="btn-primary px-5 py-2 text-sm font-semibold disabled:opacity-60"
          />
        </div>
      </section>
    </div>
  );
}
