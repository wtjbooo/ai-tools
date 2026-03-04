import { NextResponse } from "next/server";
import crypto from "crypto";

function sign(value: string, secret: string) {
  const sig = crypto.createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${sig}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = String(body?.password ?? "");

  const admin = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.AUTH_SECRET ?? "";

  if (!admin || !secret) {
    return NextResponse.json({ ok: false, error: "缺少 ADMIN_PASSWORD / AUTH_SECRET" }, { status: 500 });
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