import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const website = String(body.website ?? "").trim();
    const description = String(body.description ?? "").trim();
    const category = String(body.category ?? "").trim();
    const tags = String(body.tags ?? "").trim();
    const contact = String(body.contact ?? "").trim();
    const reason = String(body.reason ?? "").trim();

    if (!name || !website || !description || !category) {
      return NextResponse.json(
        { error: "请填写完整的工具名称、官网链接、一句话简介和分类" },
        { status: 400 }
      );
    }

    const exists = await prisma.submission.findFirst({
      where: {
        OR: [{ name }, { website }],
      },
    });

    if (exists) {
      return NextResponse.json(
        { error: "该工具或网址已提交过，请勿重复提交" },
        { status: 400 }
      );
    }

    await prisma.submission.create({
      data: {
        name,
        website,
        description,
        category,
        tags,
        contact,
        status: "pending",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "提交成功",
    });
  } catch (error) {
    console.error("submit api error:", error);

    return NextResponse.json(
      { error: "服务器开小差了，请稍后再试" },
      { status: 500 }
    );
  }
}