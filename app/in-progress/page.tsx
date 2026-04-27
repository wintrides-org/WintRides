export default function InProgressPage() {
  return (
    <main className="page-shell px-6 py-16 text-center">
      {/* Simple placeholder for unfinished flows */}
      <div className="surface-card mx-auto max-w-lg rounded-2xl p-8">
        <h1 className="text-2xl font-semibold">In progress</h1>
        <p className="text-muted mt-3 text-sm">
          This part of the experience is still being built.
        </p>
      </div>
    </main>
  );
}
