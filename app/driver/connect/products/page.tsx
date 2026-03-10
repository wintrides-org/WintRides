"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ProductRow = {
  stripeProductId: string;
  stripePriceId: string;
  name: string;
  description: string | null;
  currency: string;
  unitAmount: number | null;
  connectedAccountId: string;
  seller: {
    userId: string;
    userName: string;
    email: string;
  };
};

type AccountStatus = {
  hasConnectedAccount: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  readyToReceivePayments: boolean;
  requirementsStatus: string | null;
  error?: string;
};

export default function DriverConnectProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [name, setName] = useState("Shared Campus Ride Credit");
  const [description, setDescription] = useState(
    "Sample listing for rider checkout in low-density routes."
  );
  const [priceInCents, setPriceInCents] = useState(1500);
  const [currency, setCurrency] = useState("usd");
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const authHeaders = () => {
    const sessionToken = localStorage.getItem("sessionToken");
    return sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [statusRes, productsRes] = await Promise.all([
        fetch("/api/connect/account/status", { headers: authHeaders() }),
        fetch("/api/connect/products"),
      ]);

      const statusBody = await statusRes.json();
      if (!statusRes.ok) {
        throw new Error(statusBody.error || "Failed to load account status.");
      }
      setStatus(statusBody);

      const productsBody = await productsRes.json();
      if (!productsRes.ok) {
        throw new Error(productsBody.error || "Failed to load products.");
      }
      setProducts(productsBody.products || []);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to load data.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Creates a platform-level product and maps it to this driver's connected account.
  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    try {
      if (!status?.accountId) {
        throw new Error(
          "Create and onboard a connected account first so products can map to a payout destination."
        );
      }
      const res = await fetch("/api/connect/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          name,
          description,
          priceInCents,
          currency,
          connectedAccountId: status.accountId,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to create product.");
      }
      setMessage("Product created successfully.");
      await loadData();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to create product.";
      setMessage(text);
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4ecdf] px-6 py-10 text-[#0a1b3f]">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">Driver</p>
          <h1 className="text-3xl font-semibold text-[#0a3570]">Connect products</h1>
          <p className="text-sm text-[#6b5f52]">
            Create platform products riders can buy. Funds route to your connected account via destination charges.
          </p>
        </header>

        <section className="rounded-2xl border-2 border-[#0a3570] bg-white p-5 text-sm">
          <p>
            <span className="font-semibold">Connected account:</span>{" "}
            {status?.hasConnectedAccount ? status.accountId : "Not created"}
          </p>
          <p>
            <span className="font-semibold">Ready to receive payments:</span>{" "}
            {status?.readyToReceivePayments ? "Yes" : "No"}
          </p>
        </section>

        <section className="rounded-2xl border-2 border-[#0a3570] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#0a3570]">Create product</h2>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={createProduct}>
            <label className="flex flex-col gap-2 text-sm">
              Product name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-[#bba58c] px-3 py-2"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Price (cents)
              <input
                value={priceInCents}
                onChange={(e) => setPriceInCents(Number(e.target.value))}
                className="rounded-lg border border-[#bba58c] px-3 py-2"
                type="number"
                min={50}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm md:col-span-2">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-lg border border-[#bba58c] px-3 py-2"
                rows={3}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Currency
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-lg border border-[#bba58c] px-3 py-2"
                required
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={working}
                className="rounded-full bg-[#0a3570] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {working ? "Creating..." : "Create product"}
              </button>
            </div>
          </form>
        </section>

        {message ? (
          <p className="rounded-xl border border-[#0a3570] bg-[#f8efe3] px-4 py-3 text-sm">{message}</p>
        ) : null}

        <section className="rounded-2xl border-2 border-[#0a3570] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#0a3570]">Storefront products</h2>
            <button
              type="button"
              onClick={loadData}
              className="rounded-full border border-[#0a3570] px-4 py-1 text-xs font-semibold text-[#0a3570]"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-[#6b5f52]">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="mt-4 text-sm text-[#6b5f52]">No products yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {products.map((product) => (
                <li
                  key={product.stripeProductId}
                  className="rounded-xl border border-[#d9c5ac] bg-[#fdf7ef] p-4 text-sm"
                >
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-[#6b5f52]">{product.description || "No description"}</p>
                  <p className="mt-2">
                    {(product.unitAmount ?? 0) / 100} {product.currency.toUpperCase()} | Seller:{" "}
                    {product.seller.userName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-wrap gap-3">
          <Link
            href="/driver/connect"
            className="rounded-full border border-[#0a3570] px-5 py-2 text-sm font-semibold text-[#0a3570]"
          >
            Back to onboarding
          </Link>
          <Link
            href="/storefront"
            className="rounded-full border border-[#0a3570] px-5 py-2 text-sm font-semibold text-[#0a3570]"
          >
            Open rider storefront
          </Link>
        </section>
      </div>
    </main>
  );
}
