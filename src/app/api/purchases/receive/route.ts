import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  purchaseOrderId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const order = await db.purchaseOrder.findUnique({
    where: { id: parsed.data.purchaseOrderId },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  if (order.status === "FULL" || order.status === "CANCELLED") {
    return NextResponse.json({ error: "Commande déjà clôturée" }, { status: 409 });
  }

  const receipt = await db.goodsReceipt.create({
    data: {
      purchaseOrderId: order.id,
      supplierId: order.supplierId,
      items: {
        create: order.items.map((it) => ({
          itemId: it.itemId,
          itemName: it.itemName,
          quantity: it.quantity,
        })),
      },
    },
  });

  for (const line of order.items) {
    if (!line.itemId) continue;

    const item = await db.inventoryItem.findUnique({ where: { id: line.itemId } });
    if (!item) continue;

    const newStock = Number(item.currentStock) + Number(line.quantity);

    await db.inventoryMovement.create({
      data: {
        itemId: line.itemId,
        userId: user.id,
        type: "ENTRY",
        quantity: line.quantity,
        reason: `Réception commande ${order.reference ?? order.id.slice(0, 8)}`,
        reference: order.reference ?? undefined,
        cost: Number(line.unitPrice) * Number(line.quantity),
      },
    });

    await db.inventoryItem.update({
      where: { id: line.itemId },
      data: { currentStock: newStock },
    });

    await db.purchaseOrderItem.update({
      where: { id: line.id },
      data: { receivedQuantity: line.quantity },
    });
  }

  await db.purchaseOrder.update({
    where: { id: order.id },
    data: { status: "FULL" },
  });

  return NextResponse.json({ ok: true, receipt });
}
