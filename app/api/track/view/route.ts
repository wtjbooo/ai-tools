import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

function getClientIp(req: NextRequest) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp.trim();
  }

  return "unknown";
}

function getSessionKey(req: NextRequest) {
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") || "unknown";
  const raw = `${ip}__${ua}`;
  return createHash("sha256").update(raw).digest("hex");
}

function getDayBucket() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const slug = body?.slug;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { success: false, message: "缺少有效 slug" },
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
        { success: false, message: "工具不存在" },
        { status: 404 }
      );
    }

    const sessionKey = getSessionKey(req);
    const dayBucket = getDayBucket();

    try {
      await prisma.$transaction([
        prisma.toolViewEvent.create({
          data: {
            toolId: tool.id,
            sessionKey,
            dayBucket,
          },
        }),
        prisma.tool.update({
          where: { id: tool.id },
          data: {
            views: {
              increment: 1,
            },
          },
        }),
      ]);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json({
          success: true,
          deduped: true,
        });
      }

      throw error;
    }

    return NextResponse.json({
      success: true,
      counted: true,
    });
  } catch (error) {
    console.error("track view error:", error);

    return NextResponse.json(
      { success: false, message: "记录浏览失败" },
      { status: 500 }
    );
  }
}