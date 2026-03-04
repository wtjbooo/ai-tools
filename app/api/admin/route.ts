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

export async function POST(req: Request) {
  if (!verifyAdmin()) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  await prisma.submission.update({ where: { id }, data: { status: "rejected" } });

  return NextResponse.json({ ok: true });
}