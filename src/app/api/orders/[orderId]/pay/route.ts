import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  method: z.enum(["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "ONLINE", "CUSTOMER_ACCOUNT"]),
  receivedAmount: z.number().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: { items: { where: { status: { not: "CANCELLED" } } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  if (order.status === "PAID") {
    return NextResponse.json({ error: "Commande déjà payée" }, { status: 409 });
  }

  if (order.items.length === 0) {
    return NextResponse.json({ error: "Commande vide" }, { status: 400 });
  }

  const total = Number(order.total);

  const payment = await db.payment.create({
    data: {
      customerId: order.customerId,
      orderId: order.id,
      amount: total,
      method: parsed.data.method,
      status: "COMPLETED",
      reference: `POS-${order.id.slice(0, 8)}`,
    },
  });

  await db.order.update({
    where: { id: order.id },
    data: { status: "PAID" },
  });

  if (order.tableId) {
    await db.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "AVAILABLE" },
    });
  }

  // Enregistre le mouvement dans la session de caisse ouverte, si elle existe
  const openSession = await db.cashSession.findFirst({ where: { status: "OPEN" } });
  if (openSession && parsed.data.method === "CASH") {
    await db.cashMovement.create({
      data: {
        sessionId: openSession.id,
        type: "SALE",
        amount: total,
        reason: `Paiement commande ${order.id}`,
        reference: payment.reference ?? undefined,
      },
    });
  }

  return NextResponse.json({ ok: true, payment });
}
