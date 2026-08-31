import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildInvoiceFromOrder, buildInvoiceFromPayment, buildManualInvoice } from "@/lib/invoices/create";

export async function GET() {
  const invoices = await db.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { firstName: true, lastName: true, companyName: true } } },
  });

  return NextResponse.json(
    invoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      type: inv.type,
      status: inv.status,
      date: inv.date,
      total: Number(inv.total),
      customerName:
        inv.customer.companyName ?? `${inv.customer.firstName} ${inv.customer.lastName}`,
    })),
  );
}

const schema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("order"), orderId: z.string(), customerId: z.string().optional() }),
  z.object({ source: z.literal("coworking"), paymentId: z.string() }),
  z.object({
    source: z.literal("manual"),
    customerId: z.string(),
    notes: z.string().optional(),
    items: z
      .array(
        z.object({
          description: z.string().min(1),
          quantity: z.number().positive(),
          unitPrice: z.number().min(0),
        }),
      )
      .min(1),
  }),
]);

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

  let result;
  if (parsed.data.source === "order") {
    result = await buildInvoiceFromOrder(db, parsed.data.orderId, parsed.data.customerId);
  } else if (parsed.data.source === "coworking") {
    result = await buildInvoiceFromPayment(db, parsed.data.paymentId);
  } else {
    result = await buildManualInvoice(
      db,
      parsed.data.customerId,
      parsed.data.items,
      parsed.data.notes,
    );
  }

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json(result.invoice);
}
