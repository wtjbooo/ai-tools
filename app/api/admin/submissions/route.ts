export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

type ReviewFlag = {
  label: string;
  tone: "good" | "warn" | "danger";
};

function normalizeName(value: string) {
  return (value || "").trim().toLowerCase();
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractHostname(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isNameSimilar(a: string, b: string) {
  const x = normalizeName(a);
  const y = normalizeName(b);

  if (!x || !y) return false;
  if (x === y) return true;

  return x.includes(y) || y.includes(x);
}

function isWeakDescription(value: string) {
  const text = normalizeSpaces(value || "");

  if (!text) return true;
  if (text.length < 16) return true;

  return [
    /这里写/i,
    /待补充/i,
    /后续补充/i,
    /测试/i,
    /演示/i,
    /暂无简介/i,
  ].some((pattern) => pattern.test(text));
}

function isSingleCategoryInvalid(raw: string) {
  const value = normalizeSpaces(raw || "");
  const lower = value.toLowerCase();

  if (!value) return true;

  if (/[\/\\|]+/.test(value) || /,|，|、/.test(value)) {
    return true;
  }

  if (
    lower === "category" ||
    lower === "categories" ||
    lower === "uncategorized" ||
    lower === "unknown"
  ) {
    return true;
  }

  return value.length < 2 || value.length > 50;
}

function parseTags(raw: string) {
  return String(raw || "")
    .split(/[,，]/)
    .map((item) => normalizeSpaces(item))
    .filter(Boolean);
}

export async function GET(req: Request) {
  const ok = await isAdminAuthenticated();

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") ?? "pending").trim();

  const submissions = await prisma.submission.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      website: true,
      description: true,
      // 👇👇👇 补上这两个极其关键的长文本字段 👇👇👇
      content: true,
      tutorial: true,
      // 👆👆👆 补上这两个极其关键的长文本字段 👆👆👆
      category: true,
      tags: true,
      contact: true,
      reason: true,
      status: true,
      createdAt: true,
    },
  });

  const tools = await prisma.tool.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      website: true,
      isPublished: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    take: 1000,
    orderBy: { createdAt: "desc" },
  });

  const list = submissions.map((submission) => {
    const submissionHost = extractHostname(submission.website);

    const duplicateCandidates = tools
      .map((tool) => {
        const reasons: string[] = [];
        const toolHost = extractHostname(tool.website || "");

        if (submissionHost && toolHost && submissionHost === toolHost) {
          reasons.push("同官网域名");
        }

        if (isNameSimilar(submission.name, tool.name)) {
          reasons.push("名称接近");
        }

        return {
          id: tool.id,
          name: tool.name,
          slug: tool.slug,
          website: tool.website,
          isPublished: tool.isPublished,
          category: tool.category,
          reasons,
        };
      })
      .filter((tool) => tool.reasons.length > 0)
      .sort((a, b) => {
        const aDomain = a.reasons.includes("同官网域名") ? 1 : 0;
        const bDomain = b.reasons.includes("同官网域名") ? 1 : 0;

        if (aDomain !== bDomain) {
          return bDomain - aDomain;
        }

        return a.name.localeCompare(b.name, "zh-CN");
      })
      .slice(0, 5);

    const reviewFlags: ReviewFlag[] = [];
    const tagList = parseTags(submission.tags);

    if (!isValidHttpUrl(submission.website)) {
      reviewFlags.push({ label: "官网链接异常", tone: "danger" });
    }

    if (isWeakDescription(submission.description)) {
      reviewFlags.push({ label: "简介偏弱", tone: "danger" });
    }

    if (isSingleCategoryInvalid(submission.category)) {
      reviewFlags.push({ label: "分类待确认", tone: "danger" });
    }

    if (tagList.length === 0) {
      reviewFlags.push({ label: "标签缺失", tone: "warn" });
    } else if (tagList.length > 8) {
      reviewFlags.push({ label: "标签偏多", tone: "warn" });
    }

    if (duplicateCandidates.length > 0) {
      reviewFlags.push({ label: "疑似重复", tone: "warn" });
    }

    if (submission.reason && normalizeSpaces(submission.reason).length > 800) {
      reviewFlags.push({ label: "备注较长", tone: "warn" });
    }

    const hasDanger = reviewFlags.some((item) => item.tone === "danger");
    const hasWarn = reviewFlags.some((item) => item.tone === "warn");

    const reviewSummary = hasDanger
      ? "需先编辑"
      : hasWarn
        ? "建议复核"
        : "可直接审核";

    if (!hasDanger && !hasWarn) {
      reviewFlags.push({ label: "可直接审核", tone: "good" });
    }

    return {
      ...submission,
      duplicateCandidates,
      reviewFlags,
      reviewSummary,
      shouldFixBeforeApprove: hasDanger,
    };
  });

  return NextResponse.json({ ok: true, list });
}