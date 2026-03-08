export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const slug = String(body?.slug ?? "").trim();

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "slug required" },
        { status: 400 }
      );
    }

    const tool = await prisma.tool.findFirst({
      where: {
        slug,
        isPublished: true,
      },
      select: {
        id: true,
      },
    });

    if (!tool) {
      return NextResponse.json(
        { ok: false, error: "tool not found" },
        { status: 404 }
      );
    }

    await prisma.tool.update({
      where: { id: tool.id },
      data: {
        clicks: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("tool view api error:", error);

    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}