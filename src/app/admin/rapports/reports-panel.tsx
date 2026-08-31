"use client";

import { useEffect, useState, useCallback } from "react";
import { formatXOF } from "@/lib/utils";

interface DayRevenue {
  date: string;
  restaurant: number;
  coworking: number;
  total: number;
}

interface Summary {
  revenueByDay: DayRevenue[];
  totals: {
    totalRevenue: number;
    totalRestaurant: number;
    totalCoworking: number;
    orderCount: number;
    avgTicket: number;
  };
  occupancy: {
    tablesOccupied: number;
    tablesTotal: number;
    workstationsOccupied: number;
    workstationsTotal: number;
    coworkingHours: number;
  };
  margin: {
    revenue: number;
    cost: number;
    amount: number;
    percent: number;
    itemsCovered: number;
  };
}

const PERIODS = [
  { days: 1, label: "Aujourd'hui" },
  { days: 7, label: "7 derniers jours" },
  { days: 30, label: "30 derniers jours" },
];

export default function ReportsPanel() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    const res = await fetch(`/api/reports/summary?days=${d}`);
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  if (loading || !data) return <p className="text-sm text-neutral-500">Chargement…</p>;

  const maxDay = Math.max(1, ...data.revenueByDay.map((d) => d.total));

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              days === p.days ? "bg-laafi-bronze text-white" : "bg-white text-neutral-600 border border-neutral-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="CA total" value={formatXOF(data.totals.totalRevenue)} />
        <Card label="dont Restaurant" value={formatXOF(data.totals.totalRestaurant)} />
        <Card label="dont Coworking" value={formatXOF(data.totals.totalCoworking)} />
        <Card label="Panier moyen" value={formatXOF(data.totals.avgTicket)} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Évolution du chiffre d'affaires
        </h2>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="space-y-2">
            {data.revenueByDay.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-neutral-500">
                  {new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-neutral-100">
                  <div
                    className="h-full rounded bg-laafi-bronze"
                    style={{ width: `${(d.total / maxDay) * 100}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs font-medium text-neutral-700">
                  {formatXOF(d.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Occupation actuelle
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <OccupancyBar
              label="Tables"
              occupied={data.occupancy.tablesOccupied}
              total={data.occupancy.tablesTotal}
            />
            <OccupancyBar
              label="Postes coworking"
              occupied={data.occupancy.workstationsOccupied}
              total={data.occupancy.workstationsTotal}
            />
            <p className="pt-2 text-sm text-neutral-500">
              {data.occupancy.coworkingHours} heures de coworking vendues sur la période
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Marge brute (articles avec coût connu)
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-500">
              <span>Chiffre d'affaires</span>
              <span>{formatXOF(data.margin.revenue)}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Coût matière</span>
              <span>{formatXOF(data.margin.cost)}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold text-neutral-900">
              <span>Marge brute</span>
              <span>
                {formatXOF(data.margin.amount)}{" "}
                <span className="text-sm font-normal text-neutral-500">
                  ({data.margin.percent}%)
                </span>
              </span>
            </div>
            {data.margin.itemsCovered === 0 && (
              <p className="pt-1 text-xs text-neutral-400">
                Aucun article vendu sur la période n'a de coût de revient renseigné.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function OccupancyBar({
  label,
  occupied,
  total,
}: {
  label: string;
  occupied: number;
  total: number;
}) {
  const pct = total > 0 ? (occupied / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-neutral-700">{label}</span>
        <span className="font-medium text-neutral-900">
          {occupied} / {total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-laafi-bronze" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
