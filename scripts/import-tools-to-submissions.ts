import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type ImportItem = {
  name: string;
  website: string;
  description: string;
  category: string;
  tags?: string | string[];
  contact?: string;
  reason?: string;
};

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: unknown) {
  return normalizeSpaces(String(value ?? ""));
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .join(", ");
  }

  return normalizeText(value);
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateItem(item: ImportItem, index: number) {
  const row = index + 1;

  if (!normalizeText(item.name)) {
    throw new Error(`第 ${row} 条数据缺少 name`);
  }

  if (!normalizeText(item.website)) {
    throw new Error(`第 ${row} 条数据缺少 website`);
  }

  if (!isValidHttpUrl(normalizeText(item.website))) {
    throw new Error(`第 ${row} 条数据 website 非法：${item.website}`);
  }

  if (!normalizeText(item.description)) {
    throw new Error(`第 ${row} 条数据缺少 description`);
  }

  if (!normalizeText(item.category)) {
    throw new Error(`第 ${row} 条数据缺少 category`);
  }
}

async function main() {
  const inputArg = process.argv[2];

  if (!inputArg) {
    throw new Error(
      "请传入 JSON 文件路径，例如：npm run import:submissions -- data/tools-import.sample.json"
    );
  }

  const filePath = path.resolve(process.cwd(), inputArg);

  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在：${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("JSON 顶层必须是数组");
  }

  const items = parsed as ImportItem[];

  if (items.length === 0) {
    throw new Error("导入文件为空");
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    validateItem(item, i);

    const name = normalizeText(item.name);
    const website = normalizeText(item.website);
    const description = normalizeText(item.description);
    const category = normalizeText(item.category);
    const tags = normalizeTags(item.tags);
    const contact = normalizeText(item.contact);
    const reason = normalizeText(item.reason);

    const existingPending = await prisma.submission.findFirst({
      where: {
        status: "pending",
        OR: [{ website }, { name }],
      },
      select: { id: true, name: true, website: true },
    });

    if (existingPending) {
      skipped++;
      console.log(
        `跳过：${name}（已存在待审核 submission：${existingPending.id}）`
      );
      continue;
    }

    await prisma.submission.create({
      data: {
        name,
        website,
        description,
        category,
        tags,
        contact,
        reason,
        status: "pending",
      },
    });

    created++;
    console.log(`导入成功：${name}`);
  }

  console.log("");
  console.log(`导入完成：成功 ${created} 条，跳过 ${skipped} 条`);
}

main()
  .catch((error) => {
    console.error("导入失败：", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });