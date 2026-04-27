export default function PreferencesPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">
          Account
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Preferences</h1>
        <p className="text-muted mt-2 text-sm">
          Personalization settings live here. (Planned for v2.)
        </p>
      </header>

      <section className="surface-panel rounded-2xl border-dashed p-5">
        <h2 className="text-base font-semibold">Theme</h2>
        <p className="text-muted mt-2 text-sm">
          Placeholder for future settings.
        </p>
      </section>
    </div>
  );
}
