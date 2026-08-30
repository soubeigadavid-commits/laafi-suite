import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z
  .object({
    workstationId: z.string().min(1),
    durationHours: z.number().min(0.5).max(24),
    customerId: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine((d) => d.customerId || (d.firstName && d.lastName), {
    message: "Sélectionnez un client existant ou renseignez nom et prénom",
  });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Requête invalide" },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const workstation = await db.workstation.findUnique({
    where: { id: parsed.data.workstationId },
    include: { coworkingSpace: { select: { locationId: true } } },
  });
  if (!workstation) {
    return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });
  }
  if (workstation.status !== "AVAILABLE") {
    return NextResponse.json({ error: "Ce poste n'est pas disponible" }, { status: 409 });
  }

  let customerId = parsed.data.customerId;
  if (!customerId) {
    const customer = await db.customer.create({
      data: {
        firstName: parsed.data.firstName!,
        lastName: parsed.data.lastName!,
        phone: parsed.data.phone,
      },
    });
    customerId = customer.id;
  }

  const now = new Date();
  const endTime = new Date(now.getTime() + parsed.data.durationHours * 60 * 60 * 1000);
  const totalPrice = workstation.pricePerHour
    ? Number(workstation.pricePerHour) * parsed.data.durationHours
    : 0;

  const reservation = await db.reservation.create({
    data: {
      workstationId: workstation.id,
      customerId,
      locationId: workstation.coworkingSpace.locationId,
      startTime: now,
      endTime,
      status: "CONFIRMED",
      totalPrice,
    },
  });

  const checkin = await db.checkin.create({
    data: {
      workstationId: workstation.id,
      reservationId: reservation.id,
      customerId,
      checkInAt: now,
      expectedEndAt: endTime,
    },
  });

  await db.workstation.update({
    where: { id: workstation.id },
    data: { status: "OCCUPIED" },
  });

  return NextResponse.json({ checkin, reservation });
}
