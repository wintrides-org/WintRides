export default function DriverInfoPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5f52]">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Driver Info</h1>
        <p className="mt-2 text-sm text-[#6b5f52]">
          Driver status, license details, and insights live here.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">Driver status</h2>
          <p className="mt-2 text-sm text-[#6b5f52]">
            Placeholder for driver status message and CTA.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-5">
          <h2 className="text-base font-semibold">License</h2>
          <p className="mt-2 text-sm text-[#6b5f52]">
            Placeholder for scan/edit license flow.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-5">
        <h2 className="text-base font-semibold">Driver insights</h2>
        <p className="mt-2 text-sm text-[#6b5f52]">
          Placeholder for join date, medals, rides offered, earnings, and ratings progression.
        </p>
      </section>
    </div>
  );
}
