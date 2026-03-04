import { NextResponse } from "next/server";
import { sign } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = String(body?.password ?? "");

  const admin = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.AUTH_SECRET ?? "";

  if (!admin || !secret) {
    return NextResponse.json({ ok: false, error: "Missing ADMIN_PASSWORD/AUTH_SECRET" }, { status: 500 });
  }

  if (password !== admin) {
    return NextResponse.json({ ok: false, error: "密码错误" }, { status: 401 });
  }

  const token = sign("admin", secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}