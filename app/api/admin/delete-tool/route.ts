export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
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

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "缺少工具 id" },
        { status: 400 }
      );
    }

    const tool = await prisma.tool.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        isPublished: true,
      },
    });

    if (!tool) {
      return NextResponse.json(
        { ok: false, error: "工具不存在" },
        { status: 404 }
      );
    }

    if (tool.isPublished) {
      return NextResponse.json(
        { ok: false, error: "请先下线工具，再执行删除" },
        { status: 400 }
      );
    }

    await prisma.tool.delete({
      where: { id: tool.id },
    });

    return NextResponse.json({
      ok: true,
      message: `已删除工具：${tool.name}`,
      deleted: {
        id: tool.id,
        slug: tool.slug,
        name: tool.name,
      },
    });
  } catch (error) {
    console.error("delete-tool api error:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { ok: false, error: "工具不存在或已被删除" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "删除失败。若该工具仍有关联标签、统计或事件记录，可能需要先处理关联数据。",
      },
      { status: 500 }
    );
  }
}
