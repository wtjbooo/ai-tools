import crypto from "crypto";
import { cookies } from "next/headers";

export function sign(value: string, secret: string) {
  const sig = crypto.createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${sig}`;
}

export function verify(signed: string, secret: string) {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;

  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);

  const expected = crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("hex");

  const sigBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  return value;
}

export async function isAdminAuthenticated() {
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return false;

  const value = verify(token, secret);
  return value === "admin";
}