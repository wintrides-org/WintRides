export default function DriverInfoPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="surface-card brand-accent-top rounded-[28px] border-dashed p-6 lg:col-span-2">
          <h2 className="text-base font-semibold">Driver status</h2>
          <p className="text-muted mt-2 text-sm">
            Placeholder for driver status message and CTA.
          </p>
        </div>
        <div className="surface-card brand-accent-top rounded-[28px] border-dashed p-6">
          <h2 className="text-base font-semibold">License</h2>
          <p className="text-muted mt-2 text-sm">
            Placeholder for scan/edit license flow.
          </p>
        </div>
      </section>

      <section className="surface-card brand-accent-top rounded-[28px] border-dashed p-6">
        <h2 className="text-base font-semibold">Driver insights</h2>
        <p className="text-muted mt-2 text-sm">
          Placeholder for join date, medals, rides offered, earnings, and ratings progression.
        </p>
      </section>
    </div>
  );
}
