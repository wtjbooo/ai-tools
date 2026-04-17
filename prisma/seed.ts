import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始向 XAira 数据库填充真实 AI 工具数据...');

  // ==========================================
  // 1. 创建核心分类 (Categories)
  // ==========================================
  const textCategory = await prisma.category.upsert({
    where: { slug: 'text-generation' },
    update: {},
    create: { name: '文本写作', slug: 'text-generation', order: 1, icon: 'FileText' },
  });

  const imageCategory = await prisma.category.upsert({
    where: { slug: 'image-generation' },
    update: {},
    create: { name: '图像生成', slug: 'image-generation', order: 2, icon: 'Image' },
  });

  const codeCategory = await prisma.category.upsert({
    where: { slug: 'coding-assistant' },
    update: {},
    create: { name: '开发编程', slug: 'coding-assistant', order: 3, icon: 'Code' },
  });

  // ==========================================
  // 2. 创建核心标签 (Tags)
  // ==========================================
  const tagFree = await prisma.tag.upsert({
    where: { slug: 'free' },
    update: {},
    create: { name: '完全免费', slug: 'free' },
  });

  const tagFreemium = await prisma.tag.upsert({
    where: { slug: 'freemium' },
    update: {},
    create: { name: '免费增值', slug: 'freemium' },
  });

  // ==========================================
  // 3. 创建 AI 工具集合 (Tools) 
  // ==========================================
  
  // 工具 1: ChatGPT
  await prisma.tool.upsert({
    where: { slug: 'chatgpt' },
    update: {},
    create: {
      name: 'ChatGPT',
      slug: 'chatgpt',
      description: 'OpenAI 提供的强大对话式 AI 模型，支持文本生成、翻译、问答等多种任务。',
      website: 'https://chat.openai.com',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
      pricing: 'Freemium',
      featured: true,        // 设为推荐工具
      featuredOrder: 1,
      categoryId: textCategory.id,
      isPublished: true,     // 发布状态，确保前端能展示
      reviewStatus: 'approved',
      classificationStatus: 'completed',
      tags: {
        create: [{ tagId: tagFreemium.id }] // 关联标签
      }
    },
  });

  // 工具 2: Midjourney
  await prisma.tool.upsert({
    where: { slug: 'midjourney' },
    update: {},
    create: {
      name: 'Midjourney',
      slug: 'midjourney',
      description: '业界领先的 AI 绘图工具，能够根据文本提示生成极具艺术感的图像。',
      website: 'https://www.midjourney.com',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Midjourney_Emblem.png',
      pricing: 'Paid',
      featured: true,
      featuredOrder: 2,
      categoryId: imageCategory.id,
      isPublished: true,
      reviewStatus: 'approved',
      classificationStatus: 'completed',
      tags: {}
    },
  });

  // 工具 3: Cursor
  await prisma.tool.upsert({
    where: { slug: 'cursor' },
    update: {},
    create: {
      name: 'Cursor',
      slug: 'cursor',
      description: '专为 AI 编程设计的代码编辑器，内置强大的代码生成和问答能力。',
      website: 'https://cursor.sh',
      logoUrl: 'https://mintlify.s3-us-west-1.amazonaws.com/cursor/images/logo/cursor-mark.svg', 
      pricing: 'Freemium',
      featured: true,
      featuredOrder: 3,
      categoryId: codeCategory.id,
      isPublished: true,
      reviewStatus: 'approved',
      classificationStatus: 'completed',
      tags: {
        create: [{ tagId: tagFree.id }, { tagId: tagFreemium.id }]
      }
    },
  });

  console.log('✨ 数据库填充完毕！快去刷新主页看看吧！');
}

main()
  .catch((e) => {
    console.error('填充失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });