export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

type ToolsRange = "7d" | "30d" | "all";

function parseRange(value: string | null): ToolsRange {
  if (value === "30d") return "30d";
  if (value === "all") return "all";
  return "7d";
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getRangeLabel(range: ToolsRange) {
  if (range === "30d") return "最近 30 天";
  if (range === "all") return "全部时间";
  return "最近 7 天";
}

function normalizeSqlCount(value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

async function getEventCountsByTool(
  tableName: "ToolViewEvent" | "ToolOutClickEvent",
  toolIds: string[],
  rangeStart?: Date
) {
  if (toolIds.length === 0) {
    return new Map<string, number>();
  }

  const whereRangeSql = rangeStart
    ? Prisma.sql`AND "createdAt" >= ${rangeStart}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ toolId: string; count: unknown }>>(
    Prisma.sql`
      SELECT "toolId", COUNT(*)::int AS count
      FROM ${Prisma.raw(`"${tableName}"`)}
      WHERE "toolId" IN (${Prisma.join(toolIds)})
      ${whereRangeSql}
      GROUP BY "toolId"
    `
  );

  return new Map(
    rows.map((row) => [row.toolId, normalizeSqlCount(row.count)])
  );
}

export async function GET(request: Request) {
  const ok = await isAdminAuthenticated();

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get("range"));

  const todayStart = startOfUtcDay(new Date());

  let rangeStart: Date | undefined;
  if (range === "7d") {
    rangeStart = addUtcDays(todayStart, -6);
  } else if (range === "30d") {
    rangeStart = addUtcDays(todayStart, -29);
  } else {
    rangeStart = undefined;
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
      clicks: true,
      views: true,
      outClicks: true,
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
        outClicks: "desc",
      },
      {
        views: "desc",
      },
      {
        clicks: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    take: 300,
  });

  const toolIds = list.map((item) => item.id);

  const [viewCountMap, outClickCountMap] = await Promise.all([
    getEventCountsByTool("ToolViewEvent", toolIds, rangeStart),
    getEventCountsByTool("ToolOutClickEvent", toolIds, rangeStart),
  ]);

  const enrichedList = list.map((tool) => ({
    ...tool,
    rangeViews: viewCountMap.get(tool.id) ?? 0,
    rangeOutClicks: outClickCountMap.get(tool.id) ?? 0,
  }));

  return NextResponse.json({
    ok: true,
    meta: {
      range,
      rangeLabel: getRangeLabel(range),
    },
    list: enrichedList,
  });
}