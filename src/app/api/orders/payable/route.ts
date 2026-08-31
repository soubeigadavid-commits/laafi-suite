import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const orders = await db.order.findMany({
    where: { status: "PAID" },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      table: { select: { number: true } },
      customer: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const invoicedOrderIds = new Set(
    (
      await db.invoiceItem.findMany({
        where: { itemType: "ORDER" },
        select: { referenceId: true },
      })
    ).map((i) => i.referenceId),
  );

  const result = orders
    .filter((o) => !invoicedOrderIds.has(o.id))
    .map((o) => ({
      id: o.id,
      total: Number(o.total),
      tableNumber: o.table?.number ?? null,
      customer: o.customer
        ? { id: o.customer.id, name: `${o.customer.firstName} ${o.customer.lastName}` }
        : null,
      createdAt: o.createdAt,
    }));

  return NextResponse.json(result);
}
