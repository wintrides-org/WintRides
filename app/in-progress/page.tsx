export default function InProgressPage() {
  return (
    <main className="min-h-screen bg-[#f4ecdf] px-6 py-16 text-center text-[#0a1b3f]">
      {/* Simple placeholder for unfinished flows */}
      <div className="mx-auto max-w-lg rounded-2xl border-2 border-[#0a3570] bg-[#f8efe3] p-8">
        <h1 className="text-2xl font-semibold">In progress</h1>
        <p className="mt-3 text-sm text-[#6b5f52]">
          This part of the experience is still being built.
        </p>
      </div>
    </main>
  );
}
