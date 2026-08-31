import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const payments = await db.payment.findMany({
    where: { orderId: null, customerId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { customer: { select: { firstName: true, lastName: true } } },
  });

  const invoicedPaymentIds = new Set(
    (
      await db.invoiceItem.findMany({
        where: { itemType: "COWORKING" },
        select: { referenceId: true },
      })
    ).map((i) => i.referenceId),
  );

  const result = payments
    .filter((p) => !invoicedPaymentIds.has(p.id))
    .map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      customerName: p.customer ? `${p.customer.firstName} ${p.customer.lastName}` : "—",
      createdAt: p.createdAt,
      reference: p.reference,
    }));

  return NextResponse.json(result);
}
