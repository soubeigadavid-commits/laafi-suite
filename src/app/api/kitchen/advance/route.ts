import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({ kitchenOrderId: z.string().min(1) });

const NEXT_STATUS: Record<string, string> = {
  NEW: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const ticket = await db.kitchenOrder.findUnique({
    where: { id: parsed.data.kitchenOrderId },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
  }

  const next = NEXT_STATUS[ticket.status];
  if (!next) {
    return NextResponse.json({ error: "Ce ticket est déjà finalisé" }, { status: 409 });
  }

  await db.kitchenOrder.update({
    where: { id: ticket.id },
    data: { status: next as any },
  });

  await db.kitchenOrderItem.updateMany({
    where: { kitchenOrderId: ticket.id },
    data: { status: next as any },
  });

  if (next === "SERVED") {
    await db.orderItem.updateMany({
      where: { orderId: ticket.orderId, status: "PREPARING" },
      data: { status: "SERVED" },
    });
  }

  return NextResponse.json({ ok: true, status: next });
}
