// fetch-producthunt.js

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TOKEN = process.env.PRODUCTHUNT_TOKEN;

async function fetchProducts() {
  console.log("开始抓取 Product Hunt...");

  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
      {
        posts(first: 10) {
          edges {
            node {
              name
              tagline
              website
              slug
            }
          }
        }
      }
      `,
    }),
  });

  const data = await res.json();

  if (!data.data || !data.data.posts) {
    console.log("Product Hunt API 返回错误:");
    console.log(JSON.stringify(data, null, 2));
    return [];
  }

  return data.data.posts.edges.map((e) => e.node);
}

async function run() {
  const products = await fetchProducts();

  if (!products.length) {
    console.log("没有获取到数据");
    return;
  }

  const category = await prisma.category.findFirst();

  if (!category) {
    console.log("没有找到分类，请先创建分类");
    return;
  }

  for (const p of products) {
    const exists = await prisma.tool.findFirst({
      where: { slug: p.slug },
    });

    if (exists) {
      console.log("已存在:", p.name);
      continue;
    }

    await prisma.tool.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.tagline || "",
        website: p.website || "",
        pricing: "unknown",
        categoryId: category.id,
        searchText: p.name + " " + (p.tagline || ""),
      },
    });

    console.log("新增:", p.name);
  }

  console.log("抓取完成");

  await prisma.$disconnect();
}

run();