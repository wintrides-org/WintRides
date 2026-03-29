export default function SignOutPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5f52]">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Sign out</h1>
        <p className="mt-2 text-sm text-[#6b5f52]">
          Placeholder for sign out confirmation.
        </p>
      </header>

      <section className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-5">
        <h2 className="text-base font-semibold">Sign out action</h2>
        <p className="mt-2 text-sm text-[#6b5f52]">
          This will be wired to end the session.
        </p>
      </section>
    </div>
  );
}
