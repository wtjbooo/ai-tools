import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1) Categories
  const categories = [
    { name: "聊天助手", slug: "chat", order: 1 },
    { name: "图像生成", slug: "image", order: 2 },
    { name: "写作工具", slug: "writing", order: 3 },
    { name: "效率工具", slug: "productivity", order: 4 },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, order: c.order },
      create: c,
    });
  }

  // 2) Tags
  const tags = ["免费", "中文", "API", "开源", "热门"];
  for (const name of tags) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await prisma.tag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }

  const chat = await prisma.category.findUnique({ where: { slug: "chat" } });
  const image = await prisma.category.findUnique({ where: { slug: "image" } });
  if (!chat || !image) throw new Error("Missing categories after upsert");

  // helper
  const toSlug = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const ensureTag = async (name: string) => {
    const slug = toSlug(name);
    return prisma.tag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  };

  // 3) Tools demo data
  const toolData = [
    {
      name: "示例：Chat 工具",
      slug: "demo-chat-tool",
      description: "一个示例 AI 聊天工具，用于演示列表、详情、搜索与 SEO。",
      content: "这里是更详细的介绍内容（支持纯文本/Markdown）。",
      website: "https://example.com",
      pricing: "freemium",
      featured: true,
      logoUrl: "https://dummyimage.com/128x128/000/fff.png&text=AI",
      screenshots: [
        "https://dummyimage.com/1200x700/111/fff.png&text=Screenshot+1",
        "https://dummyimage.com/1200x700/222/fff.png&text=Screenshot+2",
      ],
      categoryId: chat.id,
      tagNames: ["热门", "中文"],
    },
    {
      name: "示例：Image 工具",
      slug: "demo-image-tool",
      description: "一个示例 AI 图像生成工具。",
      content: "支持文生图，适合做演示。",
      website: "https://example.com",
      pricing: "paid",
      featured: false,
      logoUrl: "https://dummyimage.com/128x128/333/fff.png&text=IMG",
      screenshots: ["https://dummyimage.com/1200x700/333/fff.png&text=Screenshot"],
      categoryId: image.id,
      tagNames: ["API"],
    },
  ] as const;

  for (const t of toolData) {
    const searchText = [t.name, t.description, t.content, t.tagNames.join(" ")].join(" ");

    const tool = await prisma.tool.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        description: t.description,
        content: t.content,
        website: t.website,
        pricing: t.pricing,
        featured: t.featured,
        logoUrl: t.logoUrl,
        screenshots: JSON.stringify(t.screenshots),
        searchText,
        categoryId: t.categoryId,
      },
      create: {
        name: t.name,
        slug: t.slug,
        description: t.description,
        content: t.content,
        website: t.website,
        pricing: t.pricing,
        featured: t.featured,
        logoUrl: t.logoUrl,
        screenshots: JSON.stringify(t.screenshots),
        searchText,
        categoryId: t.categoryId,
      },
    });

    // sync tool tags
    await prisma.toolTag.deleteMany({ where: { toolId: tool.id } });
    for (const tagName of t.tagNames) {
      const tag = await ensureTag(tagName);
      await prisma.toolTag.create({ data: { toolId: tool.id, tagId: tag.id } }).catch(() => {});
    }
  }

  console.log("Seed done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });