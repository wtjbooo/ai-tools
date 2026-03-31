import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (sessionToken) {
      // 在数据库中销毁对应的 Session
      await prisma.session.deleteMany({
        where: { sessionToken },
      });
    }

    // 清除客户端 Cookie
    cookieStore.delete("session_token");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LOGOUT_ERROR]", error);
    // 即使数据库操作出现异常，也强制清除本地 Cookie 以保证前端正常退出
    cookies().delete("session_token");
    return NextResponse.json({ success: true });
  }
}