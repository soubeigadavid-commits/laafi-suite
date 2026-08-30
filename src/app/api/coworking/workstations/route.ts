import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const workstations = await db.workstation.findMany({
    orderBy: { number: "asc" },
    include: {
      checkins: {
        where: { checkOutAt: null },
        orderBy: { checkInAt: "desc" },
        take: 1,
        include: {
          customer: { select: { firstName: true, lastName: true, phone: true } },
          reservation: { select: { endTime: true } },
        },
      },
    },
  });

  const result = workstations.map((w) => {
    const activeCheckin = w.checkins[0] ?? null;
    return {
      id: w.id,
      number: w.number,
      name: w.name,
      status: w.status,
      pricePerHour: w.pricePerHour ? Number(w.pricePerHour) : null,
      pricePerDay: w.pricePerDay ? Number(w.pricePerDay) : null,
      equipment: w.equipment,
      occupant: activeCheckin
        ? {
            checkinId: activeCheckin.id,
            customerName: `${activeCheckin.customer.firstName} ${activeCheckin.customer.lastName}`,
            phone: activeCheckin.customer.phone,
            checkedInAt: activeCheckin.checkInAt,
            expectedEndAt: activeCheckin.reservation?.endTime ?? activeCheckin.checkInAt,
          }
        : null,
    };
  });

  return NextResponse.json(result);
}
