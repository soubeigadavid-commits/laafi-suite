import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const createSchema = z.object({
  tableId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const tableId = req.nextUrl.searchParams.get("tableId");
  if (!tableId) {
    return NextResponse.json({ error: "tableId requis" }, { status: 400 });
  }

  const order = await db.order.findFirst({
    where: { tableId, status: { notIn: ["PAID", "CANCELLED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        where: { status: { not: "CANCELLED" } },
        include: { product: { select: { name: true, unit: true } }, variant: true },
        orderBy: { id: "asc" },
      },
    },
  });

  return NextResponse.json(order);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const table = await db.restaurantTable.findUnique({ where: { id: parsed.data.tableId } });
  if (!table) {
    return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
  }

  const existing = await db.order.findFirst({
    where: { tableId: table.id, status: { notIn: ["PAID", "CANCELLED"] } },
  });
  if (existing) {
    return NextResponse.json(existing);
  }

  const order = await db.order.create({
    data: {
      tableId: table.id,
      locationId: (await db.location.findFirstOrThrow()).id,
      serverId: user.id,
      status: "NEW",
      orderType: "DINE_IN",
    },
  });

  await db.restaurantTable.update({
    where: { id: table.id },
    data: { status: "OCCUPIED" },
  });

  return NextResponse.json(order);
}
