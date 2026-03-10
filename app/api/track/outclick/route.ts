import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const slug = body?.slug;
    const targetUrl = body?.targetUrl;

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

    await prisma.$transaction([
      prisma.toolOutClickEvent.create({
        data: {
          toolId: tool.id,
          sessionKey,
          targetUrl:
            typeof targetUrl === "string" && targetUrl.trim()
              ? targetUrl.trim()
              : null,
        },
      }),
      prisma.tool.update({
        where: { id: tool.id },
        data: {
          outClicks: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      counted: true,
    });
  } catch (error) {
    console.error("track outclick error:", error);

    return NextResponse.json(
      { success: false, message: "记录点击失败" },
      { status: 500 }
    );
  }
}