export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SITE_URL = "https://y78bq.dpdns.org";

export async function GET(
  _req: Request,
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
      return NextResponse.redirect(`${SITE_URL}/tool/${encodeURIComponent(slug)}`, 302);
    }

    await prisma.tool.update({
      where: { id: tool.id },
      data: {
        clicks: {
          increment: 1,
        },
      },
    });

    return NextResponse.redirect(tool.website, 302);
  } catch (error) {
    console.error("out redirect error:", error);
    return NextResponse.redirect(`${SITE_URL}/`, 302);
  }
}