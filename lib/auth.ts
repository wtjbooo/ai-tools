// lib/auth.ts
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

// 💡 附送：新的生成带过期时间的 Admin Token 方法
// 你在编写管理员登录接口时，应该调用这个方法来生成 Token
export function generateAdminToken(secret: string) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 默认 24 小时后过期
  const payload = `admin|${expiresAt}`; 
  return sign(payload, secret);
}

export async function isAdminAuthenticated() {
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return false;

  // 1. 解密 Token
  const value = verify(token, secret);
  if (!value) return false;

  // 2. 解析角色和时间戳 (新格式为 "admin|时间戳")
  const parts = value.split('|');

  // 【向下兼容处理】如果还是以前老的只有 "admin" 的 token，先放行
  if (parts.length === 1 && parts[0] === "admin") {
    return true; 
  }

  const role = parts[0];
  const expiresStr = parts[1];

  // 3. 校验角色是否正确
  if (role !== "admin") return false;

  // 4. 校验是否过期
  if (expiresStr) {
    const expires = parseInt(expiresStr, 10);
    if (Date.now() > expires) {
      console.log("管理员 Token 已过期");
      return false; 
    }
  }

  return true;
}