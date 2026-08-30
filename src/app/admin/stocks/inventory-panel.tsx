"use client";

import { useEffect, useState, useCallback } from "react";
import { formatXOF, formatDate } from "@/lib/utils";

interface Item {
  id: string;
  code: string | null;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
  supplierName: string | null;
  isLow: boolean;
}

interface Movement {
  id: string;
  type: string;
  quantity: string;
  reason: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string } | null;
}

const MOVEMENT_TYPES = [
  { value: "ENTRY", label: "Entrée (approvisionnement)" },
  { value: "EXIT", label: "Sortie" },
  { value: "ADJUSTMENT", label: "Ajustement d'inventaire" },
  { value: "LOSS", label: "Perte" },
  { value: "BREAKAGE", label: "Casse" },
  { value: "CONSUMPTION", label: "Consommation interne" },
];

export default function InventoryPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showNewItem, setShowNewItem] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/inventory/items");
    setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const alerts = items.filter((i) => i.isLow);

  if (loading) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="space-y-8">
      {alerts.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-red-600">
            Alertes de stock ({alerts.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-red-200 bg-red-50">
            <table className="w-full text-sm">
              <tbody>
                {alerts.map((i) => (
                  <tr key={i.id} className="border-t border-red-100 first:border-t-0">
                    <td className="px-4 py-2 font-medium text-neutral-900">{i.name}</td>
                    <td className="px-4 py-2 text-red-600">
                      {i.currentStock} {i.unit}
                    </td>
                    <td className="px-4 py-2 text-neutral-500">
                      seuil : {i.minStock} {i.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Articles ({items.length})
          </h2>
          <button
            onClick={() => setShowNewItem(true)}
            className="rounded-lg bg-laafi-bronze px-3 py-1.5 text-sm font-medium text-white hover:bg-laafi-bronze/90"
          >
            + Nouvel article
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2">Article</th>
                <th className="px-4 py-2">Catégorie</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2">Coût unitaire</th>
                <th className="px-4 py-2">Fournisseur</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2 font-medium text-neutral-900">{i.name}</td>
                  <td className="px-4 py-2 text-neutral-500">{i.category}</td>
                  <td className={`px-4 py-2 ${i.isLow ? "text-red-600 font-medium" : ""}`}>
                    {i.currentStock} {i.unit}
                  </td>
                  <td className="px-4 py-2">{formatXOF(i.unitCost)}</td>
                  <td className="px-4 py-2 text-neutral-500">{i.supplierName ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setSelectedItem(i)}
                      className="text-sm text-laafi-bronze hover:underline"
                    >
                      Mouvement
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedItem && (
        <MovementModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDone={() => {
            setSelectedItem(null);
            load();
          }}
        />
      )}

      {showNewItem && (
        <NewItemModal
          onClose={() => setShowNewItem(false)}
          onDone={() => {
            setShowNewItem(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function MovementModal({
  item,
  onClose,
  onDone,
}: {
  item: Item;
  onClose: () => void;
  onDone: () => void;
}) {
  const [type, setType] = useState("ENTRY");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<Movement[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/inventory/movements?itemId=${item.id}`)
      .then((r) => r.json())
      .then(setHistory);
  }, [item.id]);

  async function submit() {
    setError(null);
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError("Quantité invalide");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, type, quantity: qty, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="mb-1 text-lg font-semibold text-neutral-900">{item.name}</h3>
        <p className="mb-4 text-sm text-neutral-500">
          Stock actuel : {item.currentStock} {item.unit}
        </p>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Type de mouvement
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        >
          {MOVEMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Quantité ({item.unit})
        </label>
        <input
          type="number"
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Motif (optionnel)
        </label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />

        <button
          onClick={submit}
          disabled={busy}
          className="mb-4 w-full rounded-lg bg-laafi-bronze px-3 py-2.5 text-sm font-medium text-white hover:bg-laafi-bronze/90 disabled:opacity-50"
        >
          Enregistrer le mouvement
        </button>

        {history.length > 0 && (
          <>
            <p className="mb-2 text-xs font-medium uppercase text-neutral-400">
              Historique récent
            </p>
            <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-neutral-500">
              {history.map((m) => (
                <li key={m.id} className="flex justify-between">
                  <span>
                    {m.type} — {m.quantity} {item.unit}
                  </span>
                  <span>{formatDate(m.createdAt)}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-neutral-400 hover:underline"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

function NewItemModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("RAW_MATERIAL");
  const [unit, setUnit] = useState("unité");
  const [minStock, setMinStock] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name || !minStock) {
      setError("Nom et seuil minimum requis");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          unit,
          minStock: parseFloat(minStock),
          currentStock: parseFloat(currentStock || "0"),
          unitCost: parseFloat(unitCost || "0"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Nouvel article</h3>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de l'article"
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />
        <div className="mb-3 grid grid-cols-2 gap-2">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Catégorie"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
          />
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unité (kg, L, unité…)"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
          />
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <input
            type="number"
            value={currentStock}
            onChange={(e) => setCurrentStock(e.target.value)}
            placeholder="Stock initial"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
          />
          <input
            type="number"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            placeholder="Seuil min *"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
          />
          <input
            type="number"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="Coût unitaire"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
          />
        </div>

        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-lg bg-laafi-bronze px-3 py-2.5 text-sm font-medium text-white hover:bg-laafi-bronze/90 disabled:opacity-50"
        >
          Créer l'article
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
