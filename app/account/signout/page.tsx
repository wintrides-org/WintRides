import SignOutButton from "@/components/SignOutButton";

export default function SignOutPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5f52]">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Sign out</h1>
        <p className="mt-2 text-sm text-[#6b5f52]">
          End the current session on this device.
        </p>
      </header>

      <section className="rounded-2xl border border-[#0a3570] bg-white/70 p-5">
        <h2 className="text-base font-semibold">Sign out action</h2>
        <p className="mt-2 text-sm text-[#6b5f52]">
          This clears your current session and returns you to the landing page.
        </p>
        <div className="mt-4">
          <SignOutButton
            className="rounded-full border border-[#0a3570] bg-[#0a3570] px-5 py-2 text-sm font-semibold text-white hover:bg-[#092a59] disabled:opacity-60"
          />
        </div>
      </section>
    </div>
  );
}
