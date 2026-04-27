export default function DriverInfoPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">
          Account
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Driver Info</h1>
        <p className="text-muted mt-2 text-sm">
          Driver status, license details, and insights live here.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface-panel rounded-2xl border-dashed p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">Driver status</h2>
          <p className="text-muted mt-2 text-sm">
            Placeholder for driver status message and CTA.
          </p>
        </div>
        <div className="surface-panel rounded-2xl border-dashed p-5">
          <h2 className="text-base font-semibold">License</h2>
          <p className="text-muted mt-2 text-sm">
            Placeholder for scan/edit license flow.
          </p>
        </div>
      </section>

      <section className="surface-panel rounded-2xl border-dashed p-5">
        <h2 className="text-base font-semibold">Driver insights</h2>
        <p className="text-muted mt-2 text-sm">
          Placeholder for join date, medals, rides offered, earnings, and ratings progression.
        </p>
      </section>
    </div>
  );
}
