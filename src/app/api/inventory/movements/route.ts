import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "itemId requis" }, { status: 400 });
  }

  const movements = await db.inventoryMovement.findMany({
    where: { itemId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json(movements);
}

const schema = z.object({
  itemId: z.string().min(1),
  type: z.enum([
    "ENTRY",
    "EXIT",
    "ADJUSTMENT",
    "LOSS",
    "BREAKAGE",
    "CONSUMPTION",
  ]),
  quantity: z.number().positive(),
  reason: z.string().optional(),
});

const INCREASING = new Set(["ENTRY"]);

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

  const item = await db.inventoryItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  const signedQuantity = INCREASING.has(parsed.data.type)
    ? parsed.data.quantity
    : -parsed.data.quantity;

  const newStock = Number(item.currentStock) + signedQuantity;
  if (newStock < 0) {
    return NextResponse.json(
      { error: "Stock insuffisant pour cette sortie" },
      { status: 409 },
    );
  }

  const movement = await db.inventoryMovement.create({
    data: {
      itemId: item.id,
      userId: user.id,
      type: parsed.data.type,
      quantity: parsed.data.quantity,
      reason: parsed.data.reason,
      cost: Number(item.unitCost) * parsed.data.quantity,
    },
  });

  await db.inventoryItem.update({
    where: { id: item.id },
    data: { currentStock: newStock },
  });

  return NextResponse.json({ movement, newStock });
}
