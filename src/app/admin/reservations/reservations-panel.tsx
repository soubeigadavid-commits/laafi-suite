"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDate } from "@/lib/utils";

interface Reservation {
  id: string;
  date: string;
  guests: number;
  status: string;
  tableNumber: number;
  customerName: string;
  notes: string | null;
}

interface TableLite {
  id: string;
  number: number;
  capacity: number;
  status: string;
}

interface CustomerHit {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  ARRIVED: "Arrivé",
  SEATED: "Installé",
  NO_SHOW: "Absent",
  CANCELLED: "Annulée",
};

export default function ReservationsPanel() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/reservations/table");
    setReservations(await res.json());
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
          Réservations à venir ({reservations.length})
        </h2>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-lg bg-laafi-bronze px-3 py-1.5 text-sm font-medium text-white hover:bg-laafi-bronze/90"
        >
          + Nouvelle réservation
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">Date / heure</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Table</th>
              <th className="px-4 py-2">Couverts</th>
              <th className="px-4 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{formatDate(r.date)}</td>
                <td className="px-4 py-2 font-medium text-neutral-900">{r.customerName}</td>
                <td className="px-4 py-2">Table {r.tableNumber}</td>
                <td className="px-4 py-2">{r.guests}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Aucune réservation à venir.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewReservationModal
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

function NewReservationModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [tables, setTables] = useState<TableLite[]>([]);
  const [tableId, setTableId] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("2");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/restaurant/tables")
      .then((r) => r.json())
      .then((data) => {
        setTables(data);
        if (data[0]) setTableId(data[0].id);
      });
  }, []);

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

  async function submit() {
    setError(null);
    if (!tableId || !customerId || !date || !guests) {
      setError("Tous les champs sont requis");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reservations/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          customerId,
          date,
          guests: parseInt(guests, 10),
          notes,
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Nouvelle réservation</h3>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {!customerId ? (
          <>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Client</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom ou téléphone…"
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
                      {h.firstName} {h.lastName} {h.phone ? `— ${h.phone}` : ""}
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

        <label className="mb-1 block text-sm font-medium text-neutral-700">Table</label>
        <select
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        >
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              Table {t.number} ({t.capacity} pers.)
            </option>
          ))}
        </select>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Date / heure</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Couverts</label>
            <input
              type="number"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
            />
          </div>
        </div>

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optionnel)"
          className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />

        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-lg bg-laafi-bronze px-3 py-2.5 text-sm font-medium text-white hover:bg-laafi-bronze/90 disabled:opacity-50"
        >
          Confirmer la réservation
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
