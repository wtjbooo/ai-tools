import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type ImportItem = {
  name?: unknown;
  website?: unknown;
  description?: unknown;
  category?: unknown;
  tags?: unknown;
  contact?: unknown;
  reason?: unknown;
};

type CleanImportItem = {
  row: number;
  name: string;
  website: string;
  description: string;
  category: string;
  tags: string;
  contact: string;
  reason: string;
};

type ConflictItem = {
  row: number;
  name: string;
  website: string;
  conflicts: Array<{
    type:
      | "tool_same_website"
      | "tool_same_name"
      | "submission_same_website"
      | "submission_same_name";
    targetId: string;
    targetStatus?: string;
    targetName: string;
    targetWebsite: string;
    note: string;
  }>;
};

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: unknown) {
  return normalizeSpaces(String(value ?? ""));
}

function normalizeWebsite(value: unknown) {
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

function normalizeTags(value: unknown) {
  const rawList = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[,，]/);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of rawList) {
    const tag = normalizeText(item).slice(0, 30);
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

function cleanItem(raw: ImportItem, row: number): CleanImportItem {
  return {
    row,
    name: normalizeText(raw.name),
    website: normalizeWebsite(raw.website),
    description: normalizeDescription(raw.description),
    category: normalizeCategory(raw.category),
    tags: normalizeTags(raw.tags),
    contact: normalizeText(raw.contact),
    reason: normalizeReason(raw.reason),
  };
}

function buildOutputPath(inputPath: string) {
  const resolved = path.resolve(process.cwd(), inputPath);
  const dir = path.dirname(resolved);
  const ext = path.extname(resolved) || ".json";
  const base = path.basename(resolved, ext);

  return {
    input: resolved,
    report: path.join(dir, `${base}.conflicts${ext}`),
  };
}

async function main() {
  const inputArg = process.argv[2];

  if (!inputArg) {
    throw new Error(
      "请传入 JSON 文件路径，例如：npx tsx scripts/check-import-conflicts.ts data/raw-tools.cleaned.json"
    );
  }

  const paths = buildOutputPath(inputArg);

  if (!fs.existsSync(paths.input)) {
    throw new Error(`文件不存在：${paths.input}`);
  }

  const raw = fs.readFileSync(paths.input, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("JSON 顶层必须是数组");
  }

  const items = parsed.map((item, index) => cleanItem(item as ImportItem, index + 1));

  await prisma.$connect();

  const report: ConflictItem[] = [];

  for (const item of items) {
    const conflicts: ConflictItem["conflicts"] = [];

    const [toolSameWebsite, toolSameName, submissionSameWebsite, submissionSameName] =
      await Promise.all([
        prisma.tool.findFirst({
          where: {
            website: item.website,
          },
          select: {
            id: true,
            name: true,
            website: true,
          },
        }),
        prisma.tool.findFirst({
          where: {
            name: item.name,
          },
          select: {
            id: true,
            name: true,
            website: true,
          },
        }),
        prisma.submission.findFirst({
          where: {
            website: item.website,
          },
          select: {
            id: true,
            name: true,
            website: true,
            status: true,
          },
        }),
        prisma.submission.findFirst({
          where: {
            name: item.name,
          },
          select: {
            id: true,
            name: true,
            website: true,
            status: true,
          },
        }),
      ]);

    if (toolSameWebsite) {
      conflicts.push({
        type: "tool_same_website",
        targetId: toolSameWebsite.id,
        targetName: toolSameWebsite.name,
        targetWebsite: toolSameWebsite.website ?? "",
        note: "已存在相同 website 的 tool",
      });
    }

    if (toolSameName) {
      conflicts.push({
        type: "tool_same_name",
        targetId: toolSameName.id,
        targetName: toolSameName.name,
        targetWebsite: toolSameName.website ?? "",
        note: "已存在相同 name 的 tool",
      });
    }

    if (submissionSameWebsite) {
      conflicts.push({
        type: "submission_same_website",
        targetId: submissionSameWebsite.id,
        targetStatus: submissionSameWebsite.status,
        targetName: submissionSameWebsite.name,
        targetWebsite: submissionSameWebsite.website,
        note: "已存在相同 website 的 submission",
      });
    }

    if (submissionSameName) {
      conflicts.push({
        type: "submission_same_name",
        targetId: submissionSameName.id,
        targetStatus: submissionSameName.status,
        targetName: submissionSameName.name,
        targetWebsite: submissionSameName.website,
        note: "已存在相同 name 的 submission",
      });
    }

    if (conflicts.length > 0) {
      report.push({
        row: item.row,
        name: item.name,
        website: item.website,
        conflicts,
      });
    }
  }

  fs.writeFileSync(paths.report, JSON.stringify(report, null, 2), "utf8");

  console.log(`检查文件：${paths.input}`);
  console.log(`冲突报告：${paths.report}`);
  console.log(`总条数：${items.length}`);
  console.log(`冲突条数：${report.length}`);
}

main()
  .catch((error) => {
    console.error("检查失败：", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
