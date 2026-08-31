import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatXOF } from "@/lib/utils";
import AppShell from "@/components/layout/app-shell";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const [workstationsCount, occupiedWorkstations, tablesCount, occupiedTables, ordersToday, lowStockItems] =
    await Promise.all([
      db.workstation.count(),
      db.workstation.count({ where: { status: "OCCUPIED" } }),
      db.restaurantTable.count(),
      db.restaurantTable.count({ where: { status: "OCCUPIED" } }),
      db.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      db.inventoryItem.findMany({
        where: { active: true },
        select: { name: true, currentStock: true, minStock: true, unit: true },
      }),
    ]);

  const alerts = lowStockItems.filter((i) => Number(i.currentStock) <= Number(i.minStock));

  return (
    <AppShell title="Tableau de bord" userName={user?.firstName} roleName={user?.role.name}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          label="Postes coworking occupés"
          value={`${occupiedWorkstations} / ${workstationsCount}`}
        />
        <Card
          label="Tables occupées"
          value={`${occupiedTables} / ${tablesCount}`}
        />
        <Card
          label="Commandes aujourd'hui"
          value={String(ordersToday._count)}
        />
        <Card
          label="CA aujourd'hui"
          value={formatXOF(Number(ordersToday._sum.total ?? 0))}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium text-neutral-900">Alertes de stock</h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucune alerte — tous les stocks sont au-dessus du seuil minimum.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Article</th>
                  <th className="px-4 py-2">Stock actuel</th>
                  <th className="px-4 py-2">Seuil minimum</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((item) => (
                  <tr key={item.name} className="border-t border-neutral-100">
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2 text-red-600">
                      {Number(item.currentStock)} {item.unit}
                    </td>
                    <td className="px-4 py-2">
                      {Number(item.minStock)} {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
