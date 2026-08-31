import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const tickets = await db.kitchenOrder.findMany({
    where: { status: { in: ["NEW", "PREPARING", "READY"] } },
    orderBy: { createdAt: "asc" },
    include: {
      items: { include: { product: { select: { name: true } } } },
      order: { include: { table: { select: { number: true } } } },
    },
  });

  const result = tickets.map((t) => ({
    id: t.id,
    status: t.status,
    createdAt: t.createdAt,
    tableNumber: t.order.table?.number ?? null,
    orderType: t.order.orderType,
    items: t.items.map((it) => ({
      id: it.id,
      productName: it.product.name,
      quantity: it.quantity,
      comment: it.comment,
    })),
  }));

  return NextResponse.json(result);
}
