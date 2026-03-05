require("dotenv").config();

const fs = require("fs");
const csv = require("csv-parser");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function run() {
  try {

    console.log("开始导入工具...");

    // 找一个分类
    let category = await prisma.category.findFirst();

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: "AI工具",
          slug: "ai-tools",
        },
      });
    }

    const tools = [];

    fs.createReadStream("./tools.csv")
      .pipe(csv())
      .on("data", (row) => tools.push(row))
      .on("end", async () => {

        let count = 0;

        for (const tool of tools) {
          try {

            await prisma.tool.create({
              data: {
                name: tool.name,
                slug: tool.slug,
                description: tool.description || "",
                content: tool.description || "",
                website: tool.url || "",
                pricing: tool.pricing || "unknown",
                categoryId: category.id,
                searchText: `${tool.name} ${tool.description}`,
              },
            });

            count++;

          } catch (err) {
            console.log("跳过:", tool.slug);
          }
        }

        console.log("导入完成:", count);

        await prisma.$disconnect();
        process.exit();

      });

  } catch (error) {
    console.error(error);
    await prisma.$disconnect();
  }
}

run();