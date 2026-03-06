import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categoryNames = [
    "聊天助手",
    "AI写作",
    "图像生成",
    "视频生成",
    "AI搜索",
    "PPT/演示",
    "效率工具",
  ];

  const slugMap: Record<string, string> = {
    "聊天助手": "chat-assistant",
    "AI写作": "ai-writing",
    "图像生成": "image-generation",
    "视频生成": "video-generation",
    "AI搜索": "ai-search",
    "PPT/演示": "presentation",
    "效率工具": "productivity",
  };

  const orderMap: Record<string, number> = {
    "聊天助手": 1,
    "AI写作": 2,
    "图像生成": 3,
    "视频生成": 4,
    "AI搜索": 5,
    "PPT/演示": 6,
    "效率工具": 7,
  };

  const categories: Record<string, string> = {};

  for (const name of categoryNames) {
    const c = await prisma.category.upsert({
      where: { slug: slugMap[name] },
      update: {
        name,
        order: orderMap[name],
        icon: "",
      },
      create: {
        name,
        slug: slugMap[name],
        order: orderMap[name],
        icon: "",
      },
    });

    categories[name] = c.id;
  }

  const toolCategoryMap: Record<string, string> = {
    deepseek: "聊天助手",
    chatgpt: "聊天助手",
    claude: "聊天助手",
    midjourney: "图像生成",
    ideogram: "图像生成",
    runway: "视频生成",
    pika: "视频生成",
    perplexity: "AI搜索",
    gamma: "PPT/演示",
    "notion-ai": "效率工具",
  };

  for (const [slug, categoryName] of Object.entries(toolCategoryMap)) {
    await prisma.tool.updateMany({
      where: { slug },
      data: {
        categoryId: categories[categoryName],
      },
    });
  }

  await prisma.tool.updateMany({
    where: { pricing: "unknown" },
    data: { pricing: "未知" },
  });

  console.log("分类修复完成");
}

main()
  .catch((e) => {
    console.error("修复失败：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });