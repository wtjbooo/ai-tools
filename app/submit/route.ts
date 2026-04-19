import { NextRequest, NextResponse } from "next/server";
// 注意：请确保这个路径指向你项目中正确的 Prisma 客户端实例化文件
// 通常在 Next.js 项目中是 "@/lib/prisma" 或 "@/prisma/client"
import prisma from "@/lib/prisma"; 

export async function POST(req: NextRequest) {
  try {
    // 1. 获取前端发来的 JSON 数据
    const body = await req.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json({ error: "无效的请求数据" }, { status: 400 });
    }

    const {
      name,
      website,
      description,
      category,
      tags,
      contact,
      reason,
      content,  // 我们新加的 Markdown 简介
      tutorial, // 我们新加的 Markdown 教程
    } = body;

    // 2. 基础的必填项校验
    if (!name?.trim() || !website?.trim() || !description?.trim() || !category?.trim()) {
      return NextResponse.json(
        { error: "请填写完整的必填项（名称、官网、简介、分类）" },
        { status: 400 }
      );
    }

    // 3. 将数据写入 Neon 数据库中的 Submission 审核表
    const newSubmission = await prisma.submission.create({
      data: {
        name: name.trim(),
        website: website.trim(),
        description: description.trim(),
        category: category.trim(),
        tags: tags?.trim() || "",
        contact: contact?.trim() || "",
        reason: reason?.trim() || "",
        // 关键：保存我们新增的长文本字段！
        content: content?.trim() || "",
        tutorial: tutorial?.trim() || "",
        // 默认状态为待审核
        status: "pending", 
      },
    });

    // 4. 返回成功响应给前端
    return NextResponse.json({ ok: true, data: newSubmission }, { status: 201 });
    
  } catch (error) {
    console.error("提交工具到数据库失败:", error);
    return NextResponse.json(
      { error: "服务器内部错误，提交失败，请稍后重试。" },
      { status: 500 }
    );
  }
}