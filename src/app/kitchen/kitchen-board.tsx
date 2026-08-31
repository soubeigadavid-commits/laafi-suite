"use client";

import { useEffect, useState, useCallback } from "react";

interface KitchenItem {
  id: string;
  productName: string;
  quantity: number;
  comment: string | null;
}

interface Ticket {
  id: string;
  status: "NEW" | "PREPARING" | "READY";
  createdAt: string;
  tableNumber: number | null;
  orderType: string;
  items: KitchenItem[];
}

const COLUMNS: { status: Ticket["status"]; label: string; action: string; color: string }[] = [
  { status: "NEW", label: "Nouveau", action: "Démarrer", color: "border-red-300 bg-red-50" },
  {
    status: "PREPARING",
    label: "En préparation",
    action: "Marquer prêt",
    color: "border-yellow-300 bg-yellow-50",
  },
  { status: "READY", label: "Prêt", action: "Marquer servi", color: "border-green-300 bg-green-50" },
];

export default function KitchenBoard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const res = await fetch("/api/kitchen/orders");
    setTickets(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function advance(kitchenOrderId: string) {
    await fetch("/api/kitchen/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kitchenOrderId }),
    });
    load();
  }

  if (loading) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const colTickets = tickets.filter((t) => t.status === col.status);
        return (
          <div key={col.status}>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
              {col.label} ({colTickets.length})
            </h2>
            <div className="space-y-3">
              {colTickets.map((t) => {
                const elapsedSec = Math.max(0, Math.floor((now - new Date(t.createdAt).getTime()) / 1000));
                const minutes = Math.floor(elapsedSec / 60);
                const seconds = elapsedSec % 60;
                const isLate = minutes >= 10;
                return (
                  <div
                    key={t.id}
                    className={`rounded-xl border-2 p-4 ${col.color} ${isLate ? "ring-2 ring-red-400" : ""}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-neutral-900">
                        {t.tableNumber ? `Table ${t.tableNumber}` : t.orderType}
                      </span>
                      <span
                        className={`text-xs font-mono ${isLate ? "font-bold text-red-600" : "text-neutral-500"}`}
                      >
                        {minutes}:{seconds.toString().padStart(2, "0")}
                      </span>
                    </div>
                    <ul className="mb-3 space-y-1 text-sm text-neutral-700">
                      {t.items.map((it) => (
                        <li key={it.id}>
                          <span className="font-medium">{it.quantity}×</span> {it.productName}
                          {it.comment && (
                            <span className="block text-xs italic text-neutral-500">
                              {it.comment}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => advance(t.id)}
                      className="w-full rounded-lg bg-laafi-bronze px-3 py-1.5 text-sm font-medium text-white hover:bg-laafi-bronze/90"
                    >
                      {col.action}
                    </button>
                  </div>
                );
              })}
              {colTickets.length === 0 && (
                <p className="text-sm text-neutral-400">Aucun ticket</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
