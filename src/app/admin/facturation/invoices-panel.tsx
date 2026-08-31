"use client";

import { useEffect, useState, useCallback } from "react";
import { formatXOF, formatDate } from "@/lib/utils";

interface Invoice {
  id: string;
  number: string;
  type: string;
  status: string;
  date: string;
  total: number;
  customerName: string;
}

const TYPE_LABELS: Record<string, string> = {
  RESTAURANT: "Restaurant",
  COWORKING: "Coworking",
  GLOBAL: "Globale",
  SUBSCRIPTION: "Abonnement",
  COMPANY: "Entreprise",
};

export default function InvoicesPanel() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/invoices");
    setInvoices(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Factures ({invoices.length})
        </h2>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-lg bg-laafi-bronze px-3 py-1.5 text-sm font-medium text-white hover:bg-laafi-bronze/90"
        >
          + Nouvelle facture
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">N°</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-neutral-100">
                <td className="px-4 py-2 font-medium text-neutral-900">{inv.number}</td>
                <td className="px-4 py-2">{inv.customerName}</td>
                <td className="px-4 py-2 text-neutral-500">
                  {TYPE_LABELS[inv.type] ?? inv.type}
                </td>
                <td className="px-4 py-2 text-neutral-500">{formatDate(inv.date)}</td>
                <td className="px-4 py-2 font-medium">{formatXOF(inv.total)}</td>
                <td className="px-4 py-2 text-right">
                  <a
                    href={`/admin/facturation/imprimer?id=${inv.id}`}
                    target="_blank"
                    className="text-laafi-bronze hover:underline"
                  >
                    Voir / Imprimer
                  </a>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  Aucune facture pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewInvoiceModal
          onClose={() => setShowNew(false)}
          onDone={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
    </div>
  );
}

type Tab = "order" | "coworking" | "manual";

function NewInvoiceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [tab, setTab] = useState<Tab>("order");

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Nouvelle facture</h3>

        <div className="mb-4 flex gap-2">
          {[
            { key: "order" as Tab, label: "Commande restaurant" },
            { key: "coworking" as Tab, label: "Paiement coworking" },
            { key: "manual" as Tab, label: "Manuelle" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                tab === t.key
                  ? "bg-laafi-bronze text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "order" && <FromOrderTab onDone={onDone} />}
        {tab === "coworking" && <FromCoworkingTab onDone={onDone} />}
        {tab === "manual" && <ManualTab onDone={onDone} />}

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

function FromOrderTab({ onDone }: { onDone: () => void }) {
  const [orders, setOrders] = useState<
    { id: string; total: number; tableNumber: number | null; customer: { id: string; name: string } | null; createdAt: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/orders/payable")
      .then((r) => r.json())
      .then(setOrders);
  }, []);

  async function invoice(orderId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "order", orderId }),
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
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {orders.length === 0 && (
        <p className="text-sm text-neutral-400">Aucune commande payée à facturer.</p>
      )}
      <ul className="space-y-2">
        {orders.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-neutral-900">
                {o.tableNumber ? `Table ${o.tableNumber}` : "Commande"} —{" "}
                {o.customer?.name ?? "Sans client"}
              </p>
              <p className="text-xs text-neutral-500">
                {formatDate(o.createdAt)} — {formatXOF(o.total)}
              </p>
            </div>
            <button
              disabled={busy || !o.customer}
              onClick={() => invoice(o.id)}
              title={!o.customer ? "Cette commande n'a pas de client rattaché" : undefined}
              className="rounded-lg bg-laafi-bronze px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              Facturer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FromCoworkingTab({ onDone }: { onDone: () => void }) {
  const [payments, setPayments] = useState<
    { id: string; amount: number; customerName: string; createdAt: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/payments/coworking-payable")
      .then((r) => r.json())
      .then(setPayments);
  }, []);

  async function invoice(paymentId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "coworking", paymentId }),
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
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {payments.length === 0 && (
        <p className="text-sm text-neutral-400">Aucun paiement coworking à facturer.</p>
      )}
      <ul className="space-y-2">
        {payments.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-neutral-900">{p.customerName}</p>
              <p className="text-xs text-neutral-500">
                {formatDate(p.createdAt)} — {formatXOF(p.amount)}
              </p>
            </div>
            <button
              disabled={busy}
              onClick={() => invoice(p.id)}
              className="rounded-lg bg-laafi-bronze px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              Facturer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManualTab({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ id: string; firstName: string; lastName: string; phone: string | null }[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [lines, setLines] = useState([{ description: "", quantity: "1", unitPrice: "" }]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
      setHits(await res.json());
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function updateLine(i: number, field: string, value: string) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  async function submit() {
    setError(null);
    const validLines = lines.filter((l) => l.description && l.quantity && l.unitPrice);
    if (!customerId || validLines.length === 0) {
      setError("Sélectionnez un client et au moins une ligne complète");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "manual",
          customerId,
          notes,
          items: validLines.map((l) => ({
            description: l.description,
            quantity: parseFloat(l.quantity),
            unitPrice: parseFloat(l.unitPrice),
          })),
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
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {!customerId ? (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client…"
            className="mb-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
          />
          {hits.length > 0 && (
            <ul className="mb-3 max-h-32 overflow-y-auto rounded-lg border border-neutral-200">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => {
                      setCustomerId(h.id);
                      setCustomerName(`${h.firstName} ${h.lastName}`);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50"
                  >
                    {h.firstName} {h.lastName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2">
          <span className="text-sm font-medium">{customerName}</span>
          <button
            onClick={() => setCustomerId(null)}
            className="text-xs text-neutral-500 hover:underline"
          >
            Changer
          </button>
        </div>
      )}

      <p className="mb-2 text-sm font-medium text-neutral-700">Lignes</p>
      <div className="mb-3 space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              value={l.description}
              onChange={(e) => updateLine(i, "description", e.target.value)}
              placeholder="Description"
              className="col-span-6 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-laafi-bronze focus:outline-none"
            />
            <input
              type="number"
              value={l.quantity}
              onChange={(e) => updateLine(i, "quantity", e.target.value)}
              placeholder="Qté"
              className="col-span-3 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-laafi-bronze focus:outline-none"
            />
            <input
              type="number"
              value={l.unitPrice}
              onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
              placeholder="P.U."
              className="col-span-3 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-laafi-bronze focus:outline-none"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => setLines((prev) => [...prev, { description: "", quantity: "1", unitPrice: "" }])}
        className="mb-4 text-sm text-laafi-bronze hover:underline"
      >
        + Ajouter une ligne
      </button>

      <button
        onClick={submit}
        disabled={busy}
        className="w-full rounded-lg bg-laafi-bronze px-3 py-2.5 text-sm font-medium text-white hover:bg-laafi-bronze/90 disabled:opacity-50"
      >
        Créer la facture
      </button>
    </div>
  );
}
