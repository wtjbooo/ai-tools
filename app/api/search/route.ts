import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // 根据你的实际路径引入 prisma
import Fuse from "fuse.js";

export async function GET(request: Request) {
  // 1. 获取前端传来的搜索关键词
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  try {
    // 2. 从数据库中拉取所有已发布的工具
    // 注意：这里我们只拉取搜索需要的核心字段，提升性能
    const tools = await prisma.tool.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        name: true, // 假设你的工具名称字段叫 name
        slug: true,
        description: true, // 假设你有描述字段叫 description
        // 如果你有 icon/logo 字段，也可以加在这里，方便前端展示
      },
    });

    // 如果用户没有输入搜索词，默认返回空数组或者前几个推荐工具
    if (!query) {
      return NextResponse.json([]);
    }

    // 3. 召唤 Fuse.js 魔法，进行模糊匹配
    const fuse = new Fuse(tools, {
      keys: [
        { name: "name", weight: 0.7 },        // 工具名字权重最高
        { name: "description", weight: 0.3 }  // 简介描述权重次之
      ],
      threshold: 0.4, // 模糊阈值：0是绝对匹配，1是随便匹配。0.4 是一个很好的容错甜点值
      ignoreLocation: true, // 不限制搜索词必须出现在字符串的开头
    });

    // 4. 执行搜索，并提取出真正的结果数据
    const results = fuse.search(query).map((result) => result.item);

    return NextResponse.json(results);
  } catch (error) {
    console.error("搜索接口报错:", error);
    return NextResponse.json({ error: "搜索失败，请稍后重试" }, { status: 500 });
  }
}