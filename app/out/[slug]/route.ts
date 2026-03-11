export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SITE_URL = "https://y78bq.dpdns.org";

function getClientIp(req: Request) {
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

function getSessionKey(req: Request) {
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") || "unknown";
  const raw = `${ip}__${ua}`;
  return createHash("sha256").update(raw).digest("hex");
}

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = String(params.slug ?? "").trim();

    if (!slug) {
      return NextResponse.redirect(`${SITE_URL}/`, 302);
    }

    const tool = await prisma.tool.findFirst({
      where: {
        slug,
        isPublished: true,
      },
      select: {
        id: true,
        slug: true,
        website: true,
      },
    });

    if (!tool || !tool.website) {
      return NextResponse.redirect(
        `${SITE_URL}/tool/${encodeURIComponent(slug)}`,
        302
      );
    }

    const sessionKey = getSessionKey(req);

    await prisma.$transaction([
      prisma.toolOutClickEvent.create({
        data: {
          toolId: tool.id,
          sessionKey,
          targetUrl: tool.website,
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

    return NextResponse.redirect(tool.website, 302);
  } catch (error) {
    console.error("out redirect error:", error);
    return NextResponse.redirect(`${SITE_URL}/`, 302);
  }
}