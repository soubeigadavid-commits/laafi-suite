import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  checkinId: z.string().min(1),
  method: z.enum(["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "ONLINE", "CUSTOMER_ACCOUNT"]),
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

  const checkin = await db.checkin.findUnique({
    where: { id: parsed.data.checkinId },
    include: { workstation: true, reservation: true },
  });
  if (!checkin || checkin.checkOutAt) {
    return NextResponse.json({ error: "Session introuvable ou déjà clôturée" }, { status: 404 });
  }

  const now = new Date();
  const overrunMs = Math.max(0, now.getTime() - checkin.expectedEndAt.getTime());
  const overtimeMinutes = Math.round(overrunMs / 60000);
  const hourlyRate = checkin.workstation.pricePerHour
    ? Number(checkin.workstation.pricePerHour)
    : 0;
  const extraCharge = Math.round((overtimeMinutes / 60) * hourlyRate);

  const basePrice = checkin.reservation ? Number(checkin.reservation.totalPrice ?? 0) : 0;
  const totalDue = basePrice + extraCharge;

  await db.checkin.update({
    where: { id: checkin.id },
    data: {
      checkOutAt: now,
      realEndTime: now,
      overrunMinutes: overtimeMinutes,
      extraCharge,
    },
  });

  if (checkin.reservationId) {
    await db.reservation.update({
      where: { id: checkin.reservationId },
      data: { status: "COMPLETED" },
    });
  }

  await db.workstation.update({
    where: { id: checkin.workstationId },
    data: { status: "AVAILABLE" },
  });

  let payment = null;
  if (totalDue > 0) {
    payment = await db.payment.create({
      data: {
        customerId: checkin.customerId,
        amount: totalDue,
        method: parsed.data.method,
        status: "COMPLETED",
        reference: `COWORK-${checkin.id.slice(0, 8)}`,
      },
    });

    const openSession = await db.cashSession.findFirst({ where: { status: "OPEN" } });
    if (openSession && parsed.data.method === "CASH") {
      await db.cashMovement.create({
        data: {
          sessionId: openSession.id,
          type: "SALE",
          amount: totalDue,
          reason: `Coworking — poste ${checkin.workstation.number}`,
          reference: payment.reference ?? undefined,
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    basePrice,
    overtimeMinutes,
    extraCharge,
    totalDue,
    payment,
  });
}
