import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const categories = await db.productCategory.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      products: {
        where: { status: "ACTIVE", available: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          price: true,
          unit: true,
          photoUrl: true,
        },
      },
    },
  });

  return NextResponse.json(categories);
}
