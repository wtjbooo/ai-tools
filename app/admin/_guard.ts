import { cookies } from "next/headers";
import { verify } from "@/lib/auth";

export function requireAdmin() {
  const secret = process.env.AUTH_SECRET ?? "";
  const token = cookies().get("admin_token")?.value ?? "";
  const ok = secret && token && verify(token, secret) === "admin";
  if (!ok) throw new Error("UNAUTHORIZED");
}