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

function normalizeWebsite(value: string) {
  return normalizeText(value).replace(/\/+$/, "");
}

function normalizeDescription(value: unknown) {
  return normalizeText(value);
}

function normalizeReason(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeTagName(value: unknown) {
  return normalizeText(value).slice(0, 30);
}

function normalizeTags(value: unknown) {
  const rawList = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[,，]/);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of rawList) {
    const tag = normalizeTagName(item);
    if (!tag) continue;

    const key = tag.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(tag);

    if (result.length >= 8) break;
  }

  return result.join(", ");
}

function normalizeCategory(value: unknown) {
  return normalizeText(value);
}

function validateSingleCategoryName(value: string, row: number) {
  if (!value) {
    throw new Error(`第 ${row} 条数据缺少 category`);
  }

  if (/[\/\\|]+/.test(value) || /,|，|、/.test(value)) {
    throw new Error(
      `第 ${row} 条数据 category 只能填写一个主分类，不能是组合值：${value}`
    );
  }

  const lower = value.toLowerCase();

  if (
    lower === "category" ||
    lower === "categories" ||
    lower === "uncategorized" ||
    lower === "unknown"
  ) {
    throw new Error(`第 ${row} 条数据 category 无效：${value}`);
  }

  if (value.length < 2 || value.length > 50) {
    throw new Error(`第 ${row} 条数据 category 长度需在 2 到 50 个字符之间：${value}`);
  }
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeImportItem(item: ImportItem) {
  const name = normalizeText(item.name);
  const website = normalizeWebsite(item.website);
  const description = normalizeDescription(item.description);
  const category = normalizeCategory(item.category);
  const tags = normalizeTags(item.tags);
  const contact = normalizeText(item.contact);
  const reason = normalizeReason(item.reason);

  return {
    name,
    website,
    description,
    category,
    tags,
    contact,
    reason,
  };
}

function validateItem(item: ReturnType<typeof normalizeImportItem>, index: number) {
  const row = index + 1;

  if (!item.name) {
    throw new Error(`第 ${row} 条数据缺少 name`);
  }

  if (item.name.length < 2 || item.name.length > 100) {
    throw new Error(`第 ${row} 条数据 name 长度需在 2 到 100 个字符之间：${item.name}`);
  }

  if (!item.website) {
    throw new Error(`第 ${row} 条数据缺少 website`);
  }

  if (!isValidHttpUrl(item.website)) {
    throw new Error(`第 ${row} 条数据 website 非法：${item.website}`);
  }

  if (!item.description) {
    throw new Error(`第 ${row} 条数据缺少 description`);
  }

  if (item.description.length < 10 || item.description.length > 300) {
    throw new Error(
      `第 ${row} 条数据 description 长度需在 10 到 300 个字符之间：${item.name}`
    );
  }

  validateSingleCategoryName(item.category, row);

  if (item.tags.length > 300) {
    throw new Error(`第 ${row} 条数据 tags 过长：${item.name}`);
  }

  if (item.contact.length > 100) {
    throw new Error(`第 ${row} 条数据 contact 过长：${item.name}`);
  }

  if (item.reason.length > 3000) {
    throw new Error(`第 ${row} 条数据 reason 过长：${item.name}`);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message =
        error instanceof Error ? error.message : String(error ?? "未知错误");

      console.warn(`[重试 ${attempt}/${retries}] ${label} 失败：${message}`);

      if (attempt < retries) {
        try {
          await prisma.$disconnect();
        } catch {}

        await sleep(800 * attempt);

        try {
          await prisma.$connect();
        } catch {}
      }
    }
  }

  throw lastError;
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

  await prisma.$connect();

  let created = 0;
  let skipped = 0;
  let duplicateInFile = 0;

  const seenInFile = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const row = i + 1;
    const normalized = normalizeImportItem(items[i]);

    validateItem(normalized, i);

    const dedupeKey = `${normalized.website.toLowerCase()}__${normalized.name.toLowerCase()}`;

    if (seenInFile.has(dedupeKey)) {
      duplicateInFile++;
      skipped++;
      console.log(`跳过：${normalized.name}（导入文件内重复，第 ${row} 条）`);
      continue;
    }

    seenInFile.add(dedupeKey);

    const existingPending = await withRetry(
      () =>
        prisma.submission.findFirst({
          where: {
            status: "pending",
            OR: [{ website: normalized.website }, { name: normalized.name }],
          },
          select: { id: true, name: true, website: true },
        }),
      `检查待审核重复：${normalized.name}`
    );

    if (existingPending) {
      skipped++;
      console.log(
        `跳过：${normalized.name}（已存在待审核 submission：${existingPending.id}）`
      );
      continue;
    }

    const existingProcessed = await withRetry(
      () =>
        prisma.submission.findFirst({
          where: {
            status: { in: ["approved", "rejected"] },
            OR: [{ website: normalized.website }, { name: normalized.name }],
          },
          select: { id: true, status: true },
        }),
      `检查已处理 submission：${normalized.name}`
    );

    if (existingProcessed) {
      skipped++;
      console.log(
        `跳过：${normalized.name}（已存在 ${existingProcessed.status} submission：${existingProcessed.id}）`
      );
      continue;
    }

    const existingTool = await withRetry(
      () =>
        prisma.tool.findFirst({
          where: {
            OR: [{ website: normalized.website }, { name: normalized.name }],
          },
          select: { id: true, slug: true },
        }),
      `检查已收录工具：${normalized.name}`
    );

    if (existingTool) {
      skipped++;
      console.log(
        `跳过：${normalized.name}（已存在 tool：${existingTool.slug || existingTool.id}）`
      );
      continue;
    }

    await withRetry(
      () =>
        prisma.submission.create({
          data: {
            name: normalized.name,
            website: normalized.website,
            description: normalized.description,
            category: normalized.category,
            tags: normalized.tags,
            contact: normalized.contact,
            reason: normalized.reason,
            status: "pending",
          },
        }),
      `创建 submission：${normalized.name}`
    );

    created++;
    console.log(`导入成功：${normalized.name}`);
  }

  console.log("");
  console.log(
    `导入完成：成功 ${created} 条，跳过 ${skipped} 条（其中导入文件内重复 ${duplicateInFile} 条）`
  );
}

main()
  .catch((error) => {
    console.error("导入失败：", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
