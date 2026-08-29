import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { recalculateOrderTotals } from "@/lib/pos/totals";

const schema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  comment: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id: params.orderId } });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  const product = await db.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const unitPrice = Number(product.price);
  const quantity = parsed.data.quantity;

  const item = await db.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      quantity,
      unitPrice,
      comment: parsed.data.comment,
      total: unitPrice * quantity,
      status: "NEW",
    },
    include: { product: { select: { name: true, unit: true } } },
  });

  const totals = await recalculateOrderTotals(db, order.id);

  return NextResponse.json({ item, totals });
}
