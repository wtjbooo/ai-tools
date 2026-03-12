export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

function normalizeName(value: string) {
  return (value || "").trim().toLowerCase();
}

function extractHostname(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isNameSimilar(a: string, b: string) {
  const x = normalizeName(a);
  const y = normalizeName(b);

  if (!x || !y) return false;
  if (x === y) return true;

  return x.includes(y) || y.includes(x);
}

export async function GET(req: Request) {
  const ok = await isAdminAuthenticated();

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
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

    return {
      ...submission,
      duplicateCandidates,
    };
  });

  return NextResponse.json({ ok: true, list });
}