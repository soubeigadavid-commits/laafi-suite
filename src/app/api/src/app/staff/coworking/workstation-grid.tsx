"use client";

import { useEffect, useState, useCallback } from "react";
import { formatXOF, formatDate } from "@/lib/utils";

interface Occupant {
  checkinId: string;
  customerName: string;
  phone: string | null;
  checkedInAt: string;
  expectedEndAt: string;
}

interface Workstation {
  id: string;
  number: number;
  name: string | null;
  status: string;
  pricePerHour: number | null;
  pricePerDay: number | null;
  equipment: string[];
  occupant: Occupant | null;
}

interface CustomerHit {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "border-neutral-200 bg-white",
  OCCUPIED: "border-laafi-bronze bg-orange-50",
  RESERVED: "border-blue-300 bg-blue-50",
  MAINTENANCE: "border-neutral-300 bg-neutral-100 opacity-60",
  BLOCKED: "border-neutral-300 bg-neutral-100 opacity-60",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Libre",
  OCCUPIED: "Occupé",
  RESERVED: "Réservé",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Bloqué",
};

const DURATIONS = [
  { label: "1 heure", hours: 1 },
  { label: "2 heures", hours: 2 },
  { label: "4 heures", hours: 4 },
  { label: "Journée (8h)", hours: 8 },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Espèces" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CARD", label: "Carte bancaire" },
  { value: "BANK_TRANSFER", label: "Virement" },
];

export default function WorkstationGrid() {
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Workstation | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/coworking/workstations");
      setWorkstations(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return <p className="text-sm text-neutral-500">Chargement des postes…</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {workstations.map((w) => (
          <button
            key={w.id}
            onClick={() => setSelected(w)}
            className={`rounded-xl border-2 p-4 text-left transition hover:shadow-md ${STATUS_STYLES[w.status] ?? "border-neutral-200 bg-white"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-neutral-900">
                {w.name ?? `Poste ${w.number}`}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-neutral-600">
              {STATUS_LABELS[w.status] ?? w.status}
            </p>
            {w.occupant && (
              <div className="mt-2 text-xs text-neutral-500">
                <p className="font-medium text-neutral-700">{w.occupant.customerName}</p>
                <p>jusqu'à {formatDate(w.occupant.expectedEndAt)}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <WorkstationModal
          workstation={selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </>
  );
}

function WorkstationModal({
  workstation,
  onClose,
  onDone,
}: {
  workstation: Workstation;
  onClose: () => void;
  onDone: () => void;
}) {
  if (workstation.status === "OCCUPIED" && workstation.occupant) {
    return <CheckoutPanel workstation={workstation} onClose={onClose} onDone={onDone} />;
  }
  if (workstation.status === "AVAILABLE") {
    return <CheckinPanel workstation={workstation} onClose={onClose} onDone={onDone} />;
  }
  return (
    <Overlay onClose={onClose}>
      <p className="text-sm text-neutral-600">
        Ce poste est en statut « {STATUS_LABELS[workstation.status] ?? workstation.status} » et
        n'est pas disponible pour le moment.
      </p>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">
        {children}
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

function CheckinPanel({
  workstation,
  onClose,
  onDone,
}: {
  workstation: Workstation;
  onClose: () => void;
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerHit | null>(null);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [durationHours, setDurationHours] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setBusy(true);
    try {
      const res = await fetch("/api/coworking/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workstationId: workstation.id,
          durationHours,
          customerId: selectedCustomer?.id,
          firstName: selectedCustomer ? undefined : newFirstName,
          lastName: selectedCustomer ? undefined : newLastName,
          phone: selectedCustomer ? undefined : newPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors du check-in");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  const estimatedPrice = workstation.pricePerHour
    ? workstation.pricePerHour * durationHours
    : 0;

  return (
    <Overlay onClose={onClose}>
      <h3 className="mb-3 text-lg font-semibold text-neutral-900">
        Check-in — {workstation.name ?? `Poste ${workstation.number}`}
      </h3>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {!selectedCustomer ? (
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
                    onClick={() => setSelectedCustomer(h)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50"
                  >
                    {h.firstName} {h.lastName} {h.phone ? `— ${h.phone}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mb-2 text-xs text-neutral-400">Ou créer un nouveau client :</p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <input
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
              placeholder="Prénom"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
            />
            <input
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
              placeholder="Nom"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
            />
          </div>
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Téléphone (optionnel)"
            className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
          />
        </>
      ) : (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2">
          <span className="text-sm font-medium text-neutral-800">
            {selectedCustomer.firstName} {selectedCustomer.lastName}
          </span>
          <button
            onClick={() => setSelectedCustomer(null)}
            className="text-xs text-neutral-500 hover:underline"
          >
            Changer
          </button>
        </div>
      )}

      <label className="mb-1 block text-sm font-medium text-neutral-700">Durée</label>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d.hours}
            onClick={() => setDurationHours(d.hours)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              durationHours === d.hours
                ? "border-laafi-bronze bg-orange-50 text-laafi-bronze"
                : "border-neutral-200 text-neutral-600"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {workstation.pricePerHour !== null && (
        <p className="mb-4 text-sm text-neutral-500">
          Estimation : <span className="font-semibold text-neutral-900">{formatXOF(estimatedPrice)}</span>
        </p>
      )}

      <button
        onClick={submit}
        disabled={busy || (!selectedCustomer && (!newFirstName || !newLastName))}
        className="w-full rounded-lg bg-laafi-bronze px-3 py-2.5 text-sm font-medium text-white transition hover:bg-laafi-bronze/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "…" : "Confirmer le check-in"}
      </button>
    </Overlay>
  );
}

function CheckoutPanel({
  workstation,
  onClose,
  onDone,
}: {
  workstation: Workstation;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const occupant = workstation.occupant!;

  async function submit(selectedMethod: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/coworking/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: occupant.checkinId, method: selectedMethod }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors du check-out");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h3 className="mb-1 text-lg font-semibold text-neutral-900">
        Check-out — {workstation.name ?? `Poste ${workstation.number}`}
      </h3>
      <p className="mb-4 text-sm text-neutral-500">
        {occupant.customerName} — arrivé à {formatDate(occupant.checkedInAt)}
      </p>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {!method ? (
        <>
          <p className="mb-2 text-sm font-medium text-neutral-700">Mode de paiement</p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                disabled={busy}
                onClick={() => submit(m.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-laafi-bronze hover:bg-orange-50 disabled:opacity-50"
              >
                {m.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-neutral-500">Traitement…</p>
      )}
    </Overlay>
  );
}
