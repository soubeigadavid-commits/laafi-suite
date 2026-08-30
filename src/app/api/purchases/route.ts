import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const orders = await db.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { name: true } },
      items: true,
    },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      reference: o.reference,
      status: o.status,
      total: Number(o.total),
      createdAt: o.createdAt,
      supplierName: o.supplier.name,
      items: o.items.map((it) => ({
        id: it.id,
        itemId: it.itemId,
        itemName: it.itemName,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        receivedQuantity: Number(it.receivedQuantity),
      })),
    })),
  );
}

const lineSchema = z.object({
  itemId: z.string().optional(),
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

const schema = z.object({
  supplierId: z.string().min(1),
  items: z.array(lineSchema).min(1),
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

  const total = parsed.data.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  const order = await db.purchaseOrder.create({
    data: {
      supplierId: parsed.data.supplierId,
      status: "ORDERED",
      total,
      reference: `PO-${Date.now().toString().slice(-8)}`,
      items: {
        create: parsed.data.items.map((it) => ({
          itemId: it.itemId,
          itemName: it.itemName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      },
    },
    include: { items: true, supplier: { select: { name: true } } },
  });

  return NextResponse.json(order);
}
