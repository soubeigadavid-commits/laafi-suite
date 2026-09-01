import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const roles = await db.role.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(roles);
}
