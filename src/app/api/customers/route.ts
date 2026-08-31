import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET() {
  const customers = await db.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true, reservations: true, invoices: true } },
    },
  });

  return NextResponse.json(
    customers.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      companyName: c.companyName,
      phone: c.phone,
      email: c.email,
      ordersCount: c._count.orders,
      reservationsCount: c._count.reservations,
      invoicesCount: c._count.invoices,
    })),
  );
}

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  companyName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const customer = await db.customer.create({ data: parsed.data });
  return NextResponse.json(customer);
}
