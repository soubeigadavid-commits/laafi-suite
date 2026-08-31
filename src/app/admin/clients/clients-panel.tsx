"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  ordersCount: number;
  reservationsCount: number;
  invoicesCount: number;
}

export default function ClientsPanel() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/customers");
    setCustomers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.companyName?.toLowerCase().includes(q),
    );
  }, [customers, query]);

  if (loading) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un client…"
          className="w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />
        <button
          onClick={() => setShowNew(true)}
          className="shrink-0 rounded-lg bg-laafi-bronze px-3 py-1.5 text-sm font-medium text-white hover:bg-laafi-bronze/90"
        >
          + Nouveau client
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Commandes</th>
              <th className="px-4 py-2">Réservations</th>
              <th className="px-4 py-2">Factures</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100">
                <td className="px-4 py-2 font-medium text-neutral-900">
                  {c.firstName} {c.lastName}
                  {c.companyName && (
                    <span className="ml-1 text-xs text-neutral-400">({c.companyName})</span>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-500">
                  {c.phone ?? "—"} {c.email ? `· ${c.email}` : ""}
                </td>
                <td className="px-4 py-2">{c.ordersCount}</td>
                <td className="px-4 py-2">{c.reservationsCount}</td>
                <td className="px-4 py-2">{c.invoicesCount}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Aucun client trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewCustomerModal
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

function NewCustomerModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!firstName || !lastName) {
      setError("Prénom et nom requis");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, email }),
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
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Nouveau client</h3>
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Prénom"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Nom"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
          />
        </div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Téléphone"
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optionnel)"
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
