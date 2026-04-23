// app/api/get-record/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get("taskId");
    
    if (!taskId) {
      return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });
    }

    // 去万能流水表里捞出这条特定的记录
    const record = await prisma.aIGenerationRecord.findUnique({
      where: { id: taskId }
    });

    if (!record) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("读取记录失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}