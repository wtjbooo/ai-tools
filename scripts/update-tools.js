const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function run() {

  console.log("开始更新 AI 工具...");

  const tools = await prisma.tool.findMany();

  for (const tool of tools) {
    await prisma.tool.update({
      where: { id: tool.id },
      data: {
        updatedAt: new Date()
      }
    });
  }

  console.log("更新完成:", tools.length);

}

run();