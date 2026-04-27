
export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">
          Account
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Reviews</h1>
        <p className="text-muted mt-2 text-sm">
          Ratings summary and review history live here.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="surface-panel rounded-2xl border-dashed p-5">
          <h2 className="text-base font-semibold">Ratings summary</h2>
          <p className="text-muted mt-2 text-sm">
            Placeholder for average rating and breakdown.
          </p>
        </div>
        <div className="surface-panel rounded-2xl border-dashed p-5">
          <h2 className="text-base font-semibold">Filters</h2>
          <p className="text-muted mt-2 text-sm">
            Placeholder for date filter and collapsible toggle.
          </p>
        </div>
      </section>

      <section className="surface-panel rounded-2xl border-dashed p-5">
        <h2 className="text-base font-semibold">Review list</h2>
        <p className="text-muted mt-2 text-sm">
          Placeholder for the five most recent reviews with report action.
        </p>
      </section>
    </div>
  );
}
