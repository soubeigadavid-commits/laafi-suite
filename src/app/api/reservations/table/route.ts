import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET() {
  const reservations = await db.tableReservation.findMany({
    where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    orderBy: { date: "asc" },
    include: {
      table: { select: { number: true } },
      customer: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(
    reservations.map((r) => ({
      id: r.id,
      date: r.date,
      guests: r.guests,
      status: r.status,
      tableNumber: r.table.number,
      customerName: `${r.customer.firstName} ${r.customer.lastName}`,
      notes: r.notes,
    })),
  );
}

const schema = z.object({
  tableId: z.string().min(1),
  customerId: z.string().min(1),
  date: z.string().min(1),
  guests: z.number().int().positive(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const reservation = await db.tableReservation.create({
    data: {
      tableId: parsed.data.tableId,
      customerId: parsed.data.customerId,
      date: new Date(parsed.data.date),
      guests: parsed.data.guests,
      notes: parsed.data.notes,
      status: "CONFIRMED",
    },
  });

  return NextResponse.json(reservation);
}
