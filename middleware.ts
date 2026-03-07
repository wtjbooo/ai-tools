import { NextRequest, NextResponse } from "next/server";

async function verifyAdminToken(token: string, secret: string) {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return false;

  const value = token.slice(0, idx);
  const sig = token.slice(idx + 1);

  if (value !== "admin") return false;

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );

  const expectedSig = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return sig === expectedSig;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedPaths = ["/admin/submissions", "/admin/tools"];
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin", req.url);
  const secret = process.env.AUTH_SECRET ?? "";

  if (!secret) {
    return NextResponse.redirect(loginUrl);
  }

  const token = req.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  const ok = await verifyAdminToken(token, secret);

  if (!ok) {
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set("admin_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};