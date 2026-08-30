"use client";

import { useEffect, useState, useCallback } from "react";
import { formatXOF, formatDate } from "@/lib/utils";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  contactName: string | null;
}

interface InventoryItemLite {
  id: string;
  name: string;
  unit: string;
}

interface PurchaseLine {
  id: string;
  itemId: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
}

interface PurchaseOrder {
  id: string;
  reference: string | null;
  status: string;
  total: number;
  createdAt: string;
  supplierName: string;
  items: PurchaseLine[];
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ORDERED: "Commandée",
  PARTIAL: "Reçue partiellement",
  FULL: "Reçue",
  INVOICED: "Facturée",
  PAID: "Payée",
  CANCELLED: "Annulée",
};

export default function PurchasesPanel() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItemLite[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);

  const load = useCallback(async () => {
    const [supRes, itemsRes, ordersRes] = await Promise.all([
      fetch("/api/suppliers"),
      fetch("/api/inventory/items"),
      fetch("/api/purchases"),
    ]);
    setSuppliers(await supRes.json());
    setItems(await itemsRes.json());
    setOrders(await ordersRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function receive(orderId: string) {
    await fetch("/api/purchases/receive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseOrderId: orderId }),
    });
    load();
  }

  if (loading) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Fournisseurs ({suppliers.length})
          </h2>
          <button
            onClick={() => setShowNewSupplier(true)}
            className="rounded-lg border border-laafi-bronze px-3 py-1.5 text-sm font-medium text-laafi-bronze hover:bg-orange-50"
          >
            + Fournisseur
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="font-medium text-neutral-900">{s.name}</p>
              {s.contactName && <p className="text-sm text-neutral-500">{s.contactName}</p>}
              {s.phone && <p className="text-sm text-neutral-500">{s.phone}</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Commandes d'achat ({orders.length})
          </h2>
          <button
            onClick={() => setShowNewOrder(true)}
            disabled={suppliers.length === 0}
            className="rounded-lg bg-laafi-bronze px-3 py-1.5 text-sm font-medium text-white hover:bg-laafi-bronze/90 disabled:opacity-40"
          >
            + Nouvelle commande
          </button>
        </div>

        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900">
                    {o.reference} — {o.supplierName}
                  </p>
                  <p className="text-xs text-neutral-500">{formatDate(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                  {o.status !== "FULL" && o.status !== "CANCELLED" && (
                    <button
                      onClick={() => receive(o.id)}
                      className="rounded-lg border border-laafi-bronze px-3 py-1 text-xs font-medium text-laafi-bronze hover:bg-orange-50"
                    >
                      Marquer reçue
                    </button>
                  )}
                </div>
              </div>
              <ul className="text-sm text-neutral-600">
                {o.items.map((it) => (
                  <li key={it.id}>
                    {it.itemName} — {it.quantity} × {formatXOF(it.unitPrice)}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-right text-sm font-semibold text-neutral-900">
                Total : {formatXOF(o.total)}
              </p>
            </div>
          ))}
          {orders.length === 0 && (
            <p className="text-sm text-neutral-400">Aucune commande d'achat pour le moment.</p>
          )}
        </div>
      </section>

      {showNewSupplier && (
        <NewSupplierModal
          onClose={() => setShowNewSupplier(false)}
          onDone={() => {
            setShowNewSupplier(false);
            load();
          }}
        />
      )}

      {showNewOrder && (
        <NewOrderModal
          suppliers={suppliers}
          items={items}
          onClose={() => setShowNewOrder(false)}
          onDone={() => {
            setShowNewOrder(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function NewSupplierModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name) {
      setError("Le nom est requis");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, contactName }),
      });
      if (!res.ok) {
        setError("Erreur lors de la création");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Nouveau fournisseur</h3>
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du fournisseur"
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />
        <input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Nom du contact (optionnel)"
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Téléphone (optionnel)"
          className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-lg bg-laafi-bronze px-3 py-2.5 text-sm font-medium text-white hover:bg-laafi-bronze/90 disabled:opacity-50"
        >
          Créer
        </button>
        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-neutral-400 hover:underline"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function NewOrderModal({
  suppliers,
  items,
  onClose,
  onDone,
}: {
  suppliers: Supplier[];
  items: InventoryItemLite[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [lines, setLines] = useState<
    { itemId: string; itemName: string; quantity: string; unitPrice: string }[]
  >([{ itemId: "", itemName: "", quantity: "", unitPrice: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLine(index: number, field: string, value: string) {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        if (field === "itemId") {
          const matched = items.find((it) => it.id === value);
          return { ...l, itemId: value, itemName: matched?.name ?? l.itemName };
        }
        return { ...l, [field]: value };
      }),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, { itemId: "", itemName: "", quantity: "", unitPrice: "" }]);
  }

  async function submit() {
    setError(null);
    const validLines = lines.filter((l) => l.itemName && l.quantity && l.unitPrice);
    if (!supplierId || validLines.length === 0) {
      setError("Sélectionnez un fournisseur et au moins une ligne complète");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          items: validLines.map((l) => ({
            itemId: l.itemId || undefined,
            itemName: l.itemName,
            quantity: parseFloat(l.quantity),
            unitPrice: parseFloat(l.unitPrice),
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Nouvelle commande d'achat</h3>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <label className="mb-1 block text-sm font-medium text-neutral-700">Fournisseur</label>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-neutral-700">Articles</label>
        <div className="mb-3 space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <select
                value={line.itemId}
                onChange={(e) => updateLine(i, "itemId", e.target.value)}
                className="col-span-5 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-laafi-bronze focus:outline-none"
              >
                <option value="">Article libre…</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
              {!line.itemId && (
                <input
                  value={line.itemName}
                  onChange={(e) => updateLine(i, "itemName", e.target.value)}
                  placeholder="Nom"
                  className="col-span-3 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-laafi-bronze focus:outline-none"
                />
              )}
              <input
                type="number"
                value={line.quantity}
                onChange={(e) => updateLine(i, "quantity", e.target.value)}
                placeholder="Qté"
                className={`${line.itemId ? "col-span-3" : "col-span-2"} rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-laafi-bronze focus:outline-none`}
              />
              <input
                type="number"
                value={line.unitPrice}
                onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                placeholder="P.U."
                className="col-span-2 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-laafi-bronze focus:outline-none"
              />
            </div>
          ))}
        </div>

        <button
          onClick={addLine}
          className="mb-4 text-sm text-laafi-bronze hover:underline"
        >
          + Ajouter une ligne
        </button>

        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-lg bg-laafi-bronze px-3 py-2.5 text-sm font-medium text-white hover:bg-laafi-bronze/90 disabled:opacity-50"
        >
          Créer la commande
        </button>
        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-neutral-400 hover:underline"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
