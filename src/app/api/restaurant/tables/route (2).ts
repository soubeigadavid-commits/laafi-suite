import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const tables = await db.restaurantTable.findMany({
    orderBy: [{ zoneId: "asc" }, { number: "asc" }],
    include: {
      zone: { select: { name: true } },
      orders: {
        where: { status: { notIn: ["PAID", "CANCELLED"] } },
        select: { id: true, total: true, createdAt: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const result = tables.map((t) => ({
    id: t.id,
    number: t.number,
    capacity: t.capacity,
    status: t.status,
    zoneName: t.zone.name,
    activeOrderId: t.orders[0]?.id ?? null,
    activeOrderTotal: t.orders[0] ? Number(t.orders[0].total) : null,
  }));

  return NextResponse.json(result);
}
