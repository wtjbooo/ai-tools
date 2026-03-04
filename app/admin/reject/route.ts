import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "../_guard";

export async function POST(req: Request) {
  try {
    requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  await prisma.submission.update({
    where: { id },
    data: { status: "rejected" },
  });

  return NextResponse.json({ ok: true });
}