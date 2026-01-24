export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5f52]">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Payments</h1>
        <p className="mt-2 text-sm text-[#6b5f52]">
          Payment methods, receipts, and transactions live here.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-5">
          <h2 className="text-base font-semibold">Payment methods</h2>
          <p className="mt-2 text-sm text-[#6b5f52]">
            Placeholder for cards on file and add payment option CTA.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-5">
          <h2 className="text-base font-semibold">Receipts</h2>
          <p className="mt-2 text-sm text-[#6b5f52]">
            Placeholder for transaction history.
          </p>
        </div>
      </section>
    </div>
  );
}
