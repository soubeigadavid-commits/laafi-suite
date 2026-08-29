import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { recalculateOrderTotals } from "@/lib/pos/totals";

const schema = z.object({
  quantity: z.number().int().min(0).optional(),
  cancel: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string; itemId: string } },
) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const item = await db.orderItem.findUnique({ where: { id: params.itemId } });
  if (!item || item.orderId !== params.orderId) {
    return NextResponse.json({ error: "Ligne introuvable" }, { status: 404 });
  }

  if (item.status !== "NEW") {
    return NextResponse.json(
      { error: "Cette ligne a déjà été envoyée en cuisine et ne peut plus être modifiée." },
      { status: 409 },
    );
  }

  if (parsed.data.cancel || parsed.data.quantity === 0) {
    await db.orderItem.update({
      where: { id: item.id },
      data: { status: "CANCELLED" },
    });
  } else if (parsed.data.quantity) {
    await db.orderItem.update({
      where: { id: item.id },
      data: {
        quantity: parsed.data.quantity,
        total: Number(item.unitPrice) * parsed.data.quantity,
      },
    });
  }

  const totals = await recalculateOrderTotals(db, params.orderId);
  return NextResponse.json({ ok: true, totals });
}
