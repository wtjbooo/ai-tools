export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import crypto from "crypto";

function verifyAdmin() {
  const secret = process.env.AUTH_SECRET ?? "";
  const token = cookies().get("admin_token")?.value ?? "";
  if (!secret || !token) return false;

  const idx = token.lastIndexOf(".");
  if (idx === -1) return false;
  const value = token.slice(0, idx);
  const sig = token.slice(idx + 1);

  const expected = crypto.createHmac("sha256", secret).update(value).digest("hex");
  return value === "admin" && sig === expected;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeWebsite(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    if (!verifyAdmin()) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);

    const id = String(body?.id ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const website = normalizeWebsite(String(body?.website ?? ""));
    const description = String(body?.description ?? "").trim();
    const category = String(body?.category ?? "").trim();
    const tags = String(body?.tags ?? "").trim();
    const contact = String(body?.contact ?? "").trim();
    const reason = String(body?.reason ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400 }
      );
    }

    if (!name || !website || !description || !category) {
      return NextResponse.json(
        { ok: false, error: "请填写完整的工具名称、官网链接、一句话简介和分类" },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { ok: false, error: "工具名称长度需在 2 到 100 个字符之间" },
        { status: 400 }
      );
    }

    if (!isValidHttpUrl(website)) {
      return NextResponse.json(
        { ok: false, error: "官网链接格式不正确，请填写完整的 http 或 https 地址" },
        { status: 400 }
      );
    }

    if (description.length < 10 || description.length > 300) {
      return NextResponse.json(
        { ok: false, error: "一句话简介长度需在 10 到 300 个字符之间" },
        { status: 400 }
      );
    }

    if (category.length < 2 || category.length > 50) {
      return NextResponse.json(
        { ok: false, error: "分类长度需在 2 到 50 个字符之间" },
        { status: 400 }
      );
    }

    if (tags.length > 200) {
      return NextResponse.json(
        { ok: false, error: "标签内容过长，请控制在 200 个字符以内" },
        { status: 400 }
      );
    }

    if (contact.length > 100) {
      return NextResponse.json(
        { ok: false, error: "联系方式过长，请控制在 100 个字符以内" },
        { status: 400 }
      );
    }

    if (reason.length > 3000) {
      return NextResponse.json(
        { ok: false, error: "补充说明过长，请控制在 3000 个字符以内" },
        { status: 400 }
      );
    }

    const existing = await prisma.submission.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );
    }

    await prisma.submission.update({
      where: { id },
      data: {
        name,
        website,
        description,
        category,
        tags,
        contact,
        reason,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "保存成功",
    });
  } catch (error) {
    console.error("update submission api error:", error);

    return NextResponse.json(
      { ok: false, error: "保存失败，请稍后重试" },
      { status: 500 }
    );
  }
}