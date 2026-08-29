import type { PrismaClient } from "@prisma/client";

/**
 * Recalcule et enregistre subtotal / taxTotal / total d'une commande
 * à partir de ses lignes actives (hors lignes annulées).
 * Les prix produits sont TTC : le total = somme des lignes,
 * la taxe est extraite du TTC pour affichage (18% par défaut).
 */
export async function recalculateOrderTotals(db: PrismaClient, orderId: string) {
  const items = await db.orderItem.findMany({
    where: { orderId, status: { not: "CANCELLED" } },
    include: { product: { select: { taxRate: true } } },
  });

  let subtotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const lineTotal = Number(item.total);
    subtotal += lineTotal;
    const rate = Number(item.product.taxRate ?? 0.18);
    taxTotal += lineTotal - lineTotal / (1 + rate);
  }

  const total = subtotal;

  await db.order.update({
    where: { id: orderId },
    data: {
      subtotal: round2(subtotal),
      taxTotal: round2(taxTotal),
      total: round2(total),
    },
  });

  return { subtotal: round2(subtotal), taxTotal: round2(taxTotal), total: round2(total) };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
