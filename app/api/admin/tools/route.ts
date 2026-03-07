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

export async function GET() {
  if (!verifyAdmin()) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const list = await prisma.tool.findMany({
    include: {
      category: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 300,
  });

  return NextResponse.json({ ok: true, list });
}