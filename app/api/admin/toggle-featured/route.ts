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
    const featured = body?.featured;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "缺少工具 id" },
        { status: 400 }
      );
    }

    if (typeof featured !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "featured 必须是布尔值" },
        { status: 400 }
      );
    }

    const tool = await prisma.tool.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        featured: true,
      },
    });

    if (!tool) {
      return NextResponse.json(
        { ok: false, error: "工具不存在" },
        { status: 404 }
      );
    }

    if (tool.featured === featured) {
      return NextResponse.json({
        ok: true,
        message: featured ? "该工具已经是推荐状态" : "该工具已经是非推荐状态",
      });
    }

    await prisma.tool.update({
      where: { id },
      data: { featured },
    });

    return NextResponse.json({
      ok: true,
      message: featured
        ? `已将「${tool.name}」设为推荐`
        : `已取消「${tool.name}」的推荐状态`,
    });
  } catch (error) {
    console.error("toggle featured api error:", error);

    return NextResponse.json(
      { ok: false, error: "操作失败，请稍后重试" },
      { status: 500 }
    );
  }
}
