export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET(req: Request) {
  const ok = await isAdminAuthenticated();

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") ?? "pending").trim();

  const list = await prisma.submission.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, list });
}