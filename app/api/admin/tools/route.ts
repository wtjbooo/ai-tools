export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  const ok = await isAdminAuthenticated();

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const list = await prisma.tool.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      content: true,
      website: true,
      logoUrl: true,
      isPublished: true,
      featured: true,
      featuredOrder: true,
      createdAt: true,
      category: {
        select: {
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: [
      {
        featured: "desc",
      },
      {
        featuredOrder: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
    take: 300,
  });

  return NextResponse.json({ ok: true, list });
}