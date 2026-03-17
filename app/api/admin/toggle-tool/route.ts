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
    const isPublished = body?.isPublished;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "缺少工具 id" },
        { status: 400 }
      );
    }

    if (typeof isPublished !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "isPublished 必须是布尔值" },
        { status: 400 }
      );
    }

    const tool = await prisma.tool.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isPublished: true,
      },
    });

    if (!tool) {
      return NextResponse.json(
        { ok: false, error: "工具不存在" },
        { status: 404 }
      );
    }

    if (tool.isPublished === isPublished) {
      return NextResponse.json({
        ok: true,
        message: isPublished ? "该工具已经是已发布状态" : "该工具已经是已下线状态",
      });
    }

    await prisma.tool.update({
      where: { id },
      data: { isPublished },
    });

    return NextResponse.json({
      ok: true,
      message: isPublished
        ? `已重新发布「${tool.name}」`
        : `已下线「${tool.name}」`,
    });
  } catch (error) {
    console.error("toggle tool api error:", error);

    return NextResponse.json(
      { ok: false, error: "操作失败，请稍后重试" },
      { status: 500 }
    );
  }
}
