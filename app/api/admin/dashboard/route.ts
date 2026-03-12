export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

type DashboardRange = "7d" | "30d" | "all";

function parseRange(value: string | null): DashboardRange {
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

function formatDayKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function getRangeLabel(range: DashboardRange) {
  if (range === "30d") return "最近 30 天";
  if (range === "all") return "全部时间";
  return "最近 7 天";
}

function getDateBuckets(start: Date, end: Date) {
  const days: { key: string; label: string; start: Date; end: Date }[] = [];
  let cursor = startOfUtcDay(start);
  const last = startOfUtcDay(end);

  while (cursor <= last) {
    const next = addUtcDays(cursor, 1);

    days.push({
      key: formatDayKey(cursor),
      label: formatDayLabel(cursor),
      start: new Date(cursor),
      end: new Date(next),
    });

    cursor = next;
  }

  return days;
}

function normalizeSqlDay(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }

  return new Date();
}

function normalizeSqlCount(value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

async function getDailyCounts(
  tableName: "ToolViewEvent" | "ToolOutClickEvent",
  rangeStart?: Date
) {
  const whereSql = rangeStart
    ? Prisma.sql`WHERE "createdAt" >= ${rangeStart}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ day: unknown; count: unknown }>>(
    Prisma.sql`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count
      FROM ${Prisma.raw(`"${tableName}"`)}
      ${whereSql}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY DATE_TRUNC('day', "createdAt") ASC
    `
  );

  return rows.map((row) => ({
    day: normalizeSqlDay(row.day),
    count: normalizeSqlCount(row.count),
  }));
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

  const now = new Date();
  const todayStart = startOfUtcDay(now);

  const [
    pendingCount,
    approvedCount,
    rejectedCount,
    publishedCount,
    hiddenCount,
    featuredCount,
    categoryCount,
    totalViews,
    totalOutClicks,
    totalHistoryClicks,
    topByViews,
    topByOutClicks,
    recentSubmissions,
    minViewEvent,
    minOutClickEvent,
  ] = await Promise.all([
    prisma.submission.count({ where: { status: "pending" } }),
    prisma.submission.count({ where: { status: "approved" } }),
    prisma.submission.count({ where: { status: "rejected" } }),
    prisma.tool.count({ where: { isPublished: true } }),
    prisma.tool.count({ where: { isPublished: false } }),
    prisma.tool.count({ where: { featured: true, isPublished: true } }),
    prisma.category.count(),
    prisma.tool.aggregate({
      _sum: { views: true },
    }),
    prisma.tool.aggregate({
      _sum: { outClicks: true },
    }),
    prisma.tool.aggregate({
      _sum: { clicks: true },
    }),
    prisma.tool.findMany({
      where: { isPublished: true },
      orderBy: [{ views: "desc" }, { outClicks: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        views: true,
        outClicks: true,
        category: {
          select: { name: true },
        },
      },
    }),
    prisma.tool.findMany({
      where: { isPublished: true },
      orderBy: [{ outClicks: "desc" }, { views: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        views: true,
        outClicks: true,
        category: {
          select: { name: true },
        },
      },
    }),
    prisma.submission.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.toolViewEvent.aggregate({
      _min: { createdAt: true },
    }),
    prisma.toolOutClickEvent.aggregate({
      _min: { createdAt: true },
    }),
  ]);

  const earliestEventDate = [minViewEvent._min.createdAt, minOutClickEvent._min.createdAt]
    .filter((item): item is Date => Boolean(item))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  let rangeStart: Date | undefined;

  if (range === "7d") {
    rangeStart = addUtcDays(todayStart, -6);
  } else if (range === "30d") {
    rangeStart = addUtcDays(todayStart, -29);
  } else {
    rangeStart = earliestEventDate ? startOfUtcDay(earliestEventDate) : todayStart;
  }

  const [viewDailyRows, outClickDailyRows] = await Promise.all([
    getDailyCounts("ToolViewEvent", range === "all" ? undefined : rangeStart),
    getDailyCounts("ToolOutClickEvent", range === "all" ? undefined : rangeStart),
  ]);

  const safeStart =
    range === "all"
      ? earliestEventDate
        ? startOfUtcDay(earliestEventDate)
        : todayStart
      : rangeStart ?? todayStart;

  const days = getDateBuckets(safeStart, todayStart);

  const viewCountMap = new Map<string, number>();
  const outClickCountMap = new Map<string, number>();

  for (const item of viewDailyRows) {
    viewCountMap.set(formatDayKey(item.day), item.count);
  }

  for (const item of outClickDailyRows) {
    outClickCountMap.set(formatDayKey(item.day), item.count);
  }

  const trends = days.map((day) => ({
    key: day.key,
    label: day.label,
    views: viewCountMap.get(day.key) ?? 0,
    outClicks: outClickCountMap.get(day.key) ?? 0,
  }));

  const todayKey = formatDayKey(todayStart);
  const yesterdayKey = formatDayKey(addUtcDays(todayStart, -1));

  const todayViews = viewCountMap.get(todayKey) ?? 0;
  const yesterdayViews = viewCountMap.get(yesterdayKey) ?? 0;
  const todayOutClicks = outClickCountMap.get(todayKey) ?? 0;
  const yesterdayOutClicks = outClickCountMap.get(yesterdayKey) ?? 0;

  const rangeViews = trends.reduce((sum, item) => sum + item.views, 0);
  const rangeOutClicks = trends.reduce((sum, item) => sum + item.outClicks, 0);

  return NextResponse.json({
    ok: true,
    meta: {
      range,
      rangeLabel: getRangeLabel(range),
    },
    summary: {
      pendingCount,
      approvedCount,
      rejectedCount,
      publishedCount,
      hiddenCount,
      featuredCount,
      categoryCount,
      totalViews: totalViews._sum.views ?? 0,
      totalOutClicks: totalOutClicks._sum.outClicks ?? 0,
      totalHistoryClicks: totalHistoryClicks._sum.clicks ?? 0,
      rangeViews,
      rangeOutClicks,
      todayViews,
      yesterdayViews,
      todayOutClicks,
      yesterdayOutClicks,
    },
    topByViews,
    topByOutClicks,
    recentSubmissions,
    trends,
  });
}