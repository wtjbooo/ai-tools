import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const sessionToken = cookies().get("session_token")?.value;

    if (sessionToken) {
      // 级联删除或手动删除 Session 记录
      await prisma.session.deleteMany({
        where: { sessionToken },
      });
    }

    // 彻底清除 Cookie
    cookies().delete("session_token");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}