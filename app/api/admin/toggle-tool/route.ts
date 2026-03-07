export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const ok = await isAdminAuthenticated();

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const id = String(body?.id ?? "").trim();
    const isPublished = Boolean(body?.isPublished);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400 }
      );
    }

    await prisma.tool.update({
      where: { id },
      data: { isPublished },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("toggle tool api error:", error);

    return NextResponse.json(
      { ok: false, error: "操作失败，请稍后重试" },
      { status: 500 }
    );
  }
}