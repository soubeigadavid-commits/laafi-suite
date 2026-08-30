import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.inventoryItem.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { supplier: { select: { name: true } } },
  });

  const result = items.map((i) => ({
    id: i.id,
    code: i.code,
    name: i.name,
    category: i.category,
    unit: i.unit,
    currentStock: Number(i.currentStock),
    minStock: Number(i.minStock),
    unitCost: Number(i.unitCost),
    supplierName: i.supplier?.name ?? null,
    isLow: Number(i.currentStock) <= Number(i.minStock),
  }));

  return NextResponse.json(result);
}

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  minStock: z.number().min(0),
  currentStock: z.number().min(0).default(0),
  unitCost: z.number().min(0).default(0),
  supplierId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const item = await db.inventoryItem.create({
    data: parsed.data,
  });

  return NextResponse.json(item);
}
