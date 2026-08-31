import type { PrismaClient } from "@prisma/client";

export async function nextInvoiceNumber(db: PrismaClient) {
  const year = new Date().getFullYear();
  const count = await db.invoice.count({
    where: { number: { startsWith: `FAC-${year}-` } },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `FAC-${year}-${seq}`;
}

export async function findExistingInvoiceItem(
  db: PrismaClient,
  itemType: string,
  referenceId: string,
) {
  return db.invoiceItem.findFirst({
    where: { itemType, referenceId },
    include: { invoice: true },
  });
}

export async function buildInvoiceFromOrder(
  db: PrismaClient,
  orderId: string,
  customerIdOverride?: string,
) {
  const existing = await findExistingInvoiceItem(db, "ORDER", orderId);
  if (existing) {
    return { error: "Cette commande a déjà été facturée", invoice: existing.invoice };
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { where: { status: { not: "CANCELLED" } }, include: { product: true } },
      customer: true,
      table: { select: { number: true } },
    },
  });
  if (!order) return { error: "Commande introuvable" };

  const customerId = customerIdOverride ?? order.customerId;
  if (!customerId) return { error: "Un client est requis pour facturer cette commande" };

  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Client introuvable" };

  const number = await nextInvoiceNumber(db);

  const invoice = await db.invoice.create({
    data: {
      number,
      customerId,
      locationId: order.locationId,
      type: "RESTAURANT",
      status: "PAID",
      subtotal: order.subtotal,
      taxTotal: order.taxTotal,
      total: order.total,
      notes: order.table ? `Table ${order.table.number}` : undefined,
      items: {
        create: order.items.map((it) => ({
          description: it.product.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.total,
          itemType: "ORDER",
          referenceId: order.id,
        })),
      },
    },
    include: { items: true, customer: true },
  });

  return { invoice };
}

export async function buildInvoiceFromPayment(db: PrismaClient, paymentId: string) {
  const existing = await findExistingInvoiceItem(db, "COWORKING", paymentId);
  if (existing) {
    return { error: "Ce paiement a déjà été facturé", invoice: existing.invoice };
  }

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { error: "Paiement introuvable" };
  if (!payment.customerId) return { error: "Ce paiement n'est rattaché à aucun client" };

  const amount = Number(payment.amount);
  const taxTotal = amount - amount / 1.18;
  const number = await nextInvoiceNumber(db);

  const invoice = await db.invoice.create({
    data: {
      number,
      customerId: payment.customerId,
      type: "COWORKING",
      status: "PAID",
      subtotal: amount,
      taxTotal: Math.round(taxTotal * 100) / 100,
      total: amount,
      items: {
        create: [
          {
            description: "Prestation coworking",
            quantity: 1,
            unitPrice: amount,
            total: amount,
            itemType: "COWORKING",
            referenceId: payment.id,
          },
        ],
      },
    },
    include: { items: true, customer: true },
  });

  return { invoice };
}

export async function buildManualInvoice(
  db: PrismaClient,
  customerId: string,
  items: { description: string; quantity: number; unitPrice: number }[],
  notes?: string,
) {
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Client introuvable" };
  if (items.length === 0) return { error: "Au moins une ligne est requise" };

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const taxTotal = subtotal - subtotal / 1.18;
  const number = await nextInvoiceNumber(db);

  const invoice = await db.invoice.create({
    data: {
      number,
      customerId,
      type: "GLOBAL",
      subtotal,
      taxTotal: Math.round(taxTotal * 100) / 100,
      total: subtotal,
      notes,
      items: {
        create: items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.quantity * it.unitPrice,
          itemType: "MANUAL",
        })),
      },
    },
    include: { items: true, customer: true },
  });

  return { invoice };
}
