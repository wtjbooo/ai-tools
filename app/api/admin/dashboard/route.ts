export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

function formatDayKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function getLast7Days() {
  const days: { key: string; label: string; start: Date; end: Date }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const start = new Date(d);
    const end = new Date(d);
    end.setUTCDate(end.getUTCDate() + 1);

    days.push({
      key: formatDayKey(d),
      label: formatDayLabel(d),
      start,
      end,
    });
  }

  return days;
}

export async function GET() {
  const ok = await isAdminAuthenticated();

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const days = getLast7Days();
  const rangeStart = days[0].start;

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
    viewEvents,
    outClickEvents,
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
    prisma.toolViewEvent.findMany({
      where: {
        createdAt: {
          gte: rangeStart,
        },
      },
      select: {
        createdAt: true,
      },
    }),
    prisma.toolOutClickEvent.findMany({
      where: {
        createdAt: {
          gte: rangeStart,
        },
      },
      select: {
        createdAt: true,
      },
    }),
  ]);

  const viewCountMap = new Map<string, number>();
  const outClickCountMap = new Map<string, number>();

  for (const item of viewEvents) {
    const key = formatDayKey(item.createdAt);
    viewCountMap.set(key, (viewCountMap.get(key) ?? 0) + 1);
  }

  for (const item of outClickEvents) {
    const key = formatDayKey(item.createdAt);
    outClickCountMap.set(key, (outClickCountMap.get(key) ?? 0) + 1);
  }

  const trends = days.map((day) => ({
    key: day.key,
    label: day.label,
    views: viewCountMap.get(day.key) ?? 0,
    outClicks: outClickCountMap.get(day.key) ?? 0,
  }));

  const today = trends[6] ?? { views: 0, outClicks: 0 };
  const yesterday = trends[5] ?? { views: 0, outClicks: 0 };

  return NextResponse.json({
    ok: true,
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
      todayViews: today.views,
      yesterdayViews: yesterday.views,
      todayOutClicks: today.outClicks,
      yesterdayOutClicks: yesterday.outClicks,
    },
    topByViews,
    topByOutClicks,
    recentSubmissions,
    trends,
  });
}