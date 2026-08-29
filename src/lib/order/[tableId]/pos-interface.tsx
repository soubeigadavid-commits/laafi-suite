"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatXOF } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: string;
  unit: string;
}

interface Category {
  id: string;
  name: string;
  products: Product[];
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  total: string;
  status: "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
  product: { name: string; unit: string };
}

interface OrderData {
  id: string;
  status: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  items: OrderItem[];
}

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "CASH", label: "Espèces" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CARD", label: "Carte bancaire" },
  { value: "BANK_TRANSFER", label: "Virement" },
];

export default function POSInterface({
  tableId,
  tableNumber,
  zoneName,
}: {
  tableId: string;
  tableNumber: number;
  zoneName: string;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const loadMenu = useCallback(async () => {
    const res = await fetch("/api/products");
    const data: Category[] = await res.json();
    setCategories(data);
    if (data.length > 0) setActiveCategory((prev) => prev ?? data[0].id);
  }, []);

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/orders?tableId=${tableId}`);
    const data = await res.json();
    setOrder(data);
  }, [tableId]);

  useEffect(() => {
    Promise.all([loadMenu(), loadOrder()]).finally(() => setLoading(false));
  }, [loadMenu, loadOrder]);

  async function ensureOrder(): Promise<string> {
    if (order?.id) return order.id;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId }),
    });
    const data = await res.json();
    return data.id;
  }

  async function addProduct(productId: string) {
    setError(null);
    setBusy(true);
    try {
      const orderId = await ensureOrder();
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur lors de l'ajout");
        return;
      }
      await loadOrder();
    } finally {
      setBusy(false);
    }
  }

  async function changeQuantity(itemId: string, quantity: number) {
    if (!order) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Impossible de modifier cette ligne");
        return;
      }
      await loadOrder();
    } finally {
      setBusy(false);
    }
  }

  async function sendToKitchen() {
    if (!order) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/send-kitchen`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur lors de l'envoi en cuisine");
        return;
      }
      await loadOrder();
    } finally {
      setBusy(false);
    }
  }

  async function pay(method: string) {
    if (!order) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur lors du paiement");
        return;
      }
      setShowPayment(false);
      router.push("/staff/caisse");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-neutral-500">Chargement…</div>;
  }

  const hasNewItems = order?.items.some((i) => i.status === "NEW") ?? false;
  const activeItems = order?.items.filter((i) => i.status !== "CANCELLED") ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 lg:flex-row">
      {/* Menu */}
      <div className="flex-1 p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/staff/caisse")}
              className="text-sm text-neutral-500 hover:underline"
            >
              ← Retour aux tables
            </button>
            <h1 className="text-xl font-semibold text-neutral-900">
              Table {tableNumber} — {zoneName}
            </h1>
          </div>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeCategory === c.id
                  ? "bg-laafi-bronze text-white"
                  : "bg-white text-neutral-600 border border-neutral-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {categories
            .find((c) => c.id === activeCategory)
            ?.products.map((p) => (
              <button
                key={p.id}
                disabled={busy}
                onClick={() => addProduct(p.id)}
                className="rounded-xl border border-neutral-200 bg-white p-3 text-left transition hover:border-laafi-bronze hover:shadow-md disabled:opacity-50"
              >
                <p className="text-sm font-medium text-neutral-900">{p.name}</p>
                <p className="mt-1 text-sm font-semibold text-laafi-bronze">
                  {formatXOF(Number(p.price))}
                </p>
              </button>
            ))}
        </div>
      </div>

      {/* Panier / commande */}
      <div className="w-full border-t border-neutral-200 bg-white p-4 lg:w-96 lg:border-l lg:border-t-0">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Commande en cours
        </h2>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {activeItems.length === 0 ? (
          <p className="text-sm text-neutral-400">Aucun article — sélectionnez un produit.</p>
        ) : (
          <ul className="space-y-2">
            {activeItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">{item.product.name}</p>
                  <p className="text-xs text-neutral-500">
                    {formatXOF(Number(item.unitPrice))} × {item.quantity}
                    {item.status !== "NEW" && (
                      <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase text-neutral-500">
                        envoyé
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === "NEW" ? (
                    <>
                      <button
                        onClick={() => changeQuantity(item.id, item.quantity - 1)}
                        disabled={busy}
                        className="h-6 w-6 rounded-full border border-neutral-300 text-sm leading-none"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => changeQuantity(item.id, item.quantity + 1)}
                        disabled={busy}
                        className="h-6 w-6 rounded-full border border-neutral-300 text-sm leading-none"
                      >
                        +
                      </button>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-neutral-700">
                      {formatXOF(Number(item.total))}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-1 border-t border-neutral-200 pt-3 text-sm">
          <div className="flex justify-between text-neutral-500">
            <span>Sous-total</span>
            <span>{formatXOF(Number(order?.subtotal ?? 0))}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>TVA incluse</span>
            <span>{formatXOF(Number(order?.taxTotal ?? 0))}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-neutral-900">
            <span>Total</span>
            <span>{formatXOF(Number(order?.total ?? 0))}</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <button
            onClick={sendToKitchen}
            disabled={busy || !hasNewItems}
            className="w-full rounded-lg border border-laafi-bronze px-3 py-2.5 text-sm font-medium text-laafi-bronze transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Envoyer en cuisine
          </button>
          <button
            onClick={() => setShowPayment(true)}
            disabled={busy || activeItems.length === 0}
            className="w-full rounded-lg bg-laafi-bronze px-3 py-2.5 text-sm font-medium text-white transition hover:bg-laafi-bronze/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Encaisser
          </button>
        </div>
      </div>

      {showPayment && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-1 text-lg font-semibold text-neutral-900">Encaissement</h3>
            <p className="mb-4 text-2xl font-bold text-laafi-bronze">
              {formatXOF(Number(order?.total ?? 0))}
            </p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  disabled={busy}
                  onClick={() => pay(m.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-laafi-bronze hover:bg-orange-50 disabled:opacity-50"
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPayment(false)}
              disabled={busy}
              className="mt-4 w-full text-center text-sm text-neutral-400 hover:underline"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
