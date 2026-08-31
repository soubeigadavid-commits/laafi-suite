import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "7", 10);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  // --- Chiffre d'affaires restaurant ---
  const orders = await db.order.findMany({
    where: { status: "PAID", createdAt: { gte: since } },
    select: { total: true, createdAt: true },
  });

  // --- Chiffre d'affaires coworking ---
  const coworkingPayments = await db.payment.findMany({
    where: {
      orderId: null,
      customerId: { not: null },
      status: "COMPLETED",
      createdAt: { gte: since },
    },
    select: { amount: true, createdAt: true },
  });

  const byDay = new Map<string, { restaurant: number; coworking: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    byDay.set(dayKey(d), { restaurant: 0, coworking: 0 });
  }
  for (const o of orders) {
    const key = dayKey(o.createdAt);
    const entry = byDay.get(key);
    if (entry) entry.restaurant += Number(o.total);
  }
  for (const p of coworkingPayments) {
    const key = dayKey(p.createdAt);
    const entry = byDay.get(key);
    if (entry) entry.coworking += Number(p.amount);
  }

  const revenueByDay = Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    restaurant: Math.round(v.restaurant),
    coworking: Math.round(v.coworking),
    total: Math.round(v.restaurant + v.coworking),
  }));

  const totalRestaurant = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalCoworking = coworkingPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalRevenue = totalRestaurant + totalCoworking;
  const orderCount = orders.length;
  const avgTicket = orderCount > 0 ? totalRestaurant / orderCount : 0;

  // --- Occupation (instantanée) ---
  const [tablesTotal, tablesOccupied, workstationsTotal, workstationsOccupied] =
    await Promise.all([
      db.restaurantTable.count(),
      db.restaurantTable.count({ where: { status: "OCCUPIED" } }),
      db.workstation.count(),
      db.workstation.count({ where: { status: "OCCUPIED" } }),
    ]);

  // --- Heures coworking vendues sur la période ---
  const checkins = await db.checkin.findMany({
    where: { checkInAt: { gte: since } },
    select: { checkInAt: true, checkOutAt: true },
  });
  const coworkingHours = checkins.reduce((sum, c) => {
    const end = c.checkOutAt ?? new Date();
    return sum + (end.getTime() - c.checkInAt.getTime()) / 3_600_000;
  }, 0);

  // --- Marge brute (articles avec coût de revient connu) ---
  const orderItems = await db.orderItem.findMany({
    where: {
      status: { not: "CANCELLED" },
      order: { status: "PAID", createdAt: { gte: since } },
      product: { costPrice: { not: null } },
    },
    include: { product: { select: { costPrice: true } } },
  });

  const marginRevenue = orderItems.reduce((s, it) => s + Number(it.total), 0);
  const marginCost = orderItems.reduce(
    (s, it) => s + it.quantity * Number(it.product.costPrice ?? 0),
    0,
  );
  const marginAmount = marginRevenue - marginCost;
  const marginPercent = marginRevenue > 0 ? (marginAmount / marginRevenue) * 100 : 0;

  return NextResponse.json({
    revenueByDay,
    totals: {
      totalRevenue: Math.round(totalRevenue),
      totalRestaurant: Math.round(totalRestaurant),
      totalCoworking: Math.round(totalCoworking),
      orderCount,
      avgTicket: Math.round(avgTicket),
    },
    occupancy: {
      tablesOccupied,
      tablesTotal,
      workstationsOccupied,
      workstationsTotal,
      coworkingHours: Math.round(coworkingHours * 10) / 10,
    },
    margin: {
      revenue: Math.round(marginRevenue),
      cost: Math.round(marginCost),
      amount: Math.round(marginAmount),
      percent: Math.round(marginPercent * 10) / 10,
      itemsCovered: orderItems.length,
    },
  });
}
