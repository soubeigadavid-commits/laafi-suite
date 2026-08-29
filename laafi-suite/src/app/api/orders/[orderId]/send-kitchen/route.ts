import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: { orderId: string } }) {
  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: { table: { select: { number: true } }, server: { select: { firstName: true, lastName: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  const newItems = await db.orderItem.findMany({
    where: { orderId: order.id, status: "NEW" },
  });

  if (newItems.length === 0) {
    return NextResponse.json({ error: "Aucun nouvel article à envoyer" }, { status: 400 });
  }

  const kitchenOrder = await db.kitchenOrder.create({
    data: {
      orderId: order.id,
      status: "NEW",
      items: {
        create: newItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          comment: item.comment,
          status: "NEW",
        })),
      },
    },
    include: { items: true },
  });

  await db.orderItem.updateMany({
    where: { id: { in: newItems.map((i) => i.id) } },
    data: { status: "PREPARING" },
  });

  await db.order.update({
    where: { id: order.id },
    data: { status: "PREPARING" },
  });

  return NextResponse.json({ kitchenOrder });
}
