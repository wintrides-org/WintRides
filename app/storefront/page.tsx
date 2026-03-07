"use client";

import { useEffect, useState } from "react";
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

export default function StorefrontPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // Loads all products across all connected accounts to simulate a rider storefront.
  async function loadProducts() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/connect/products");
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to load storefront products.");
      }
      setProducts(body.products || []);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to load storefront products.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // Starts a hosted Checkout session for the selected product.
  async function buyProduct(productId: string) {
    setBuyingId(productId);
    setMessage("");
    try {
      const res = await fetch("/api/connect/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity: 1,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to create checkout session.");
      }
      window.location.href = body.url;
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Failed to create checkout session.";
      setMessage(text);
      setBuyingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4ecdf] px-6 py-10 text-[#0a1b3f]">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5f52]">Rider</p>
          <h1 className="text-3xl font-semibold text-[#0a3570]">Storefront</h1>
          <p className="text-sm text-[#6b5f52]">
            Riders purchase a product through hosted Checkout. WintRides takes an application fee and
            routes the remainder to the selected connected account.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/driver/connect"
            className="rounded-full border border-[#0a3570] px-5 py-2 text-sm font-semibold text-[#0a3570]"
          >
            Driver onboarding
          </Link>
          <Link
            href="/driver/connect/products"
            className="rounded-full border border-[#0a3570] px-5 py-2 text-sm font-semibold text-[#0a3570]"
          >
            Driver product manager
          </Link>
        </div>

        {message ? (
          <p className="rounded-xl border border-[#0a3570] bg-[#f8efe3] px-4 py-3 text-sm">{message}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[#6b5f52]">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="rounded-xl border border-[#0a3570] bg-white p-4 text-sm">
            No products are available yet.
          </p>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.stripeProductId}
                className="rounded-2xl border-2 border-[#0a3570] bg-white p-5"
              >
                <h2 className="text-lg font-semibold text-[#0a3570]">{product.name}</h2>
                <p className="mt-2 text-sm text-[#6b5f52]">
                  {product.description || "No description provided."}
                </p>
                <p className="mt-4 text-sm">
                  <span className="font-semibold">
                    {((product.unitAmount ?? 0) / 100).toFixed(2)} {product.currency.toUpperCase()}
                  </span>
                </p>
                <p className="mt-1 text-xs text-[#6b5f52]">
                  Driver: {product.seller.userName} | Account: {product.connectedAccountId}
                </p>
                <button
                  type="button"
                  onClick={() => buyProduct(product.stripeProductId)}
                  disabled={buyingId === product.stripeProductId}
                  className="mt-4 rounded-full bg-[#0a3570] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {buyingId === product.stripeProductId ? "Redirecting..." : "Buy now"}
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
