import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import POSInterface from "./pos-interface";

export default async function OrderPage({ params }: { params: { tableId: string } }) {
  const table = await db.restaurantTable.findUnique({
    where: { id: params.tableId },
    include: { zone: { select: { name: true } } },
  });

  if (!table) {
    notFound();
  }

  return <POSInterface tableId={table.id} tableNumber={table.number} zoneName={table.zone.name} />;
}
