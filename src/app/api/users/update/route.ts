import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  userId: z.string().min(1),
  roleId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const data: { roleId?: string; isActive?: boolean } = {};
  if (parsed.data.roleId) data.roleId = parsed.data.roleId;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  await db.user.update({
    where: { id: parsed.data.userId },
    data,
  });

  return NextResponse.json({ ok: true });
}
