"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatXOF } from "@/lib/utils";

interface TableCard {
  id: string;
  number: number;
  capacity: number;
  status: string;
  zoneName: string;
  activeOrderId: string | null;
  activeOrderTotal: number | null;
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "border-neutral-200 bg-white",
  OCCUPIED: "border-laafi-bronze bg-orange-50",
  RESERVED: "border-blue-300 bg-blue-50",
  CLEANING: "border-yellow-300 bg-yellow-50",
  OUT_OF_SERVICE: "border-neutral-300 bg-neutral-100 opacity-60",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Libre",
  OCCUPIED: "Occupée",
  RESERVED: "Réservée",
  CLEANING: "Nettoyage",
  OUT_OF_SERVICE: "Hors service",
};

export default function TableGrid() {
  const router = useRouter();
  const [tables, setTables] = useState<TableCard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/restaurant/tables");
      const data = await res.json();
      setTables(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return <p className="text-sm text-neutral-500">Chargement des tables…</p>;
  }

  const zones = Array.from(new Set(tables.map((t) => t.zoneName)));

  return (
    <div className="space-y-8">
      {zones.map((zone) => (
        <section key={zone}>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
            {zone}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {tables
              .filter((t) => t.zoneName === zone)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => router.push(`/staff/caisse/order/${t.id}`)}
                  className={`rounded-xl border-2 p-4 text-left transition hover:shadow-md ${STATUS_STYLES[t.status] ?? "border-neutral-200 bg-white"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-neutral-900">
                      Table {t.number}
                    </span>
                    <span className="text-xs text-neutral-500">{t.capacity} pers.</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-neutral-600">
                    {STATUS_LABELS[t.status] ?? t.status}
                  </p>
                  {t.activeOrderTotal !== null && (
                    <p className="mt-2 text-sm font-semibold text-laafi-bronze">
                      {formatXOF(t.activeOrderTotal)}
                    </p>
                  )}
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
