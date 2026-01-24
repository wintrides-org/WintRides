export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5f52]">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Reviews</h1>
        <p className="mt-2 text-sm text-[#6b5f52]">
          Ratings summary and review history live here.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-5">
          <h2 className="text-base font-semibold">Ratings summary</h2>
          <p className="mt-2 text-sm text-[#6b5f52]">
            Placeholder for average rating and breakdown.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-5">
          <h2 className="text-base font-semibold">Filters</h2>
          <p className="mt-2 text-sm text-[#6b5f52]">
            Placeholder for date filter and collapsible toggle.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-[#0a3570] bg-white/70 p-5">
        <h2 className="text-base font-semibold">Review list</h2>
        <p className="mt-2 text-sm text-[#6b5f52]">
          Placeholder for the five most recent reviews with report action.
        </p>
      </section>
    </div>
  );
}
