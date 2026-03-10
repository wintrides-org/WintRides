import Link from "next/link";

type SuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function ConnectSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  return (
    <main className="min-h-screen bg-[#f4ecdf] px-6 py-10 text-[#0a1b3f]">
      <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border-2 border-[#0a3570] bg-white p-6">
        <h1 className="text-2xl font-semibold text-[#0a3570]">Payment successful</h1>
        <p className="text-sm text-[#6b5f52]">
          Checkout completed. A destination charge transferred funds to the connected account with an
          application fee for the platform.
        </p>
        <p className="text-xs text-[#6b5f52]">
          Session ID: <span className="font-mono">{sessionId || "not provided"}</span>
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/storefront"
            className="rounded-full border border-[#0a3570] px-5 py-2 text-sm font-semibold text-[#0a3570]"
          >
            Back to storefront
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-[#0a3570] px-5 py-2 text-sm font-semibold text-[#0a3570]"
          >
            Rider dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
