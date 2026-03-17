import fs from "node:fs";
import path from "node:path";

type RawImportItem = {
  name?: unknown;
  website?: unknown;
  description?: unknown;
  category?: unknown;
  tags?: unknown;
  contact?: unknown;
  reason?: unknown;
};

type CleanImportItem = {
  name: string;
  website: string;
  description: string;
  category: string;
  tags: string;
  contact: string;
  reason: string;
};

type DuplicateReportItem = {
  row: number;
  name: string;
  website: string;
  reason: string;
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

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateSingleCategoryName(value: string) {
  if (!value) {
    return "分类不能为空";
  }

  if (/[\/\\|]+/.test(value) || /,|，|、/.test(value)) {
    return "分类只能填写一个主分类，不能是组合值";
  }

  const lower = value.toLowerCase();

  if (
    lower === "category" ||
    lower === "categories" ||
    lower === "uncategorized" ||
    lower === "unknown"
  ) {
    return "分类值无效";
  }

  if (value.length < 2 || value.length > 50) {
    return "分类长度需在 2 到 50 个字符之间";
  }

  return "";
}

function cleanItem(raw: RawImportItem): CleanImportItem {
  return {
    name: normalizeText(raw.name),
    website: normalizeWebsite(raw.website),
    description: normalizeDescription(raw.description),
    category: normalizeCategory(raw.category),
    tags: normalizeTags(raw.tags),
    contact: normalizeText(raw.contact),
    reason: normalizeReason(raw.reason),
  };
}

function validateItem(item: CleanImportItem, row: number) {
  const errors: string[] = [];

  if (!item.name) {
    errors.push("缺少 name");
  } else if (item.name.length < 2 || item.name.length > 100) {
    errors.push("name 长度需在 2 到 100 个字符之间");
  }

  if (!item.website) {
    errors.push("缺少 website");
  } else if (!isValidHttpUrl(item.website)) {
    errors.push("website 不是合法的 http/https 地址");
  }

  if (!item.description) {
    errors.push("缺少 description");
  } else if (item.description.length < 10 || item.description.length > 300) {
    errors.push("description 长度需在 10 到 300 个字符之间");
  }

  const categoryError = validateSingleCategoryName(item.category);
  if (categoryError) {
    errors.push(categoryError);
  }

  if (item.tags.length > 300) {
    errors.push("tags 总长度过长");
  }

  if (item.contact.length > 100) {
    errors.push("contact 过长");
  }

  if (item.reason.length > 3000) {
    errors.push("reason 过长");
  }

  if (errors.length > 0) {
    throw new Error(`第 ${row} 条数据校验失败：${errors.join("；")}`);
  }
}

function buildOutputPaths(inputPath: string) {
  const resolved = path.resolve(process.cwd(), inputPath);
  const dir = path.dirname(resolved);
  const ext = path.extname(resolved) || ".json";
  const base = path.basename(resolved, ext);

  return {
    input: resolved,
    cleaned: path.join(dir, `${base}.cleaned${ext}`),
    duplicates: path.join(dir, `${base}.duplicates${ext}`),
  };
}

async function main() {
  const inputArg = process.argv[2];

  if (!inputArg) {
    throw new Error(
      "请传入原始 JSON 文件路径，例如：npx tsx scripts/clean-import-tools.ts data/raw-tools.json"
    );
  }

  const paths = buildOutputPaths(inputArg);

  if (!fs.existsSync(paths.input)) {
    throw new Error(`文件不存在：${paths.input}`);
  }

  const raw = fs.readFileSync(paths.input, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("JSON 顶层必须是数组");
  }

  const cleanedList: CleanImportItem[] = [];
  const duplicateReport: DuplicateReportItem[] = [];
  const seen = new Map<string, { row: number; name: string; website: string }>();

  for (let i = 0; i < parsed.length; i++) {
    const row = i + 1;
    const cleaned = cleanItem(parsed[i] as RawImportItem);

    validateItem(cleaned, row);

    const dedupeKey = `${cleaned.website.toLowerCase()}__${cleaned.name.toLowerCase()}`;

    const existing = seen.get(dedupeKey);
    if (existing) {
      duplicateReport.push({
        row,
        name: cleaned.name,
        website: cleaned.website,
        reason: `与第 ${existing.row} 条重复（同 website + name）`,
      });
      continue;
    }

    seen.set(dedupeKey, {
      row,
      name: cleaned.name,
      website: cleaned.website,
    });

    cleanedList.push(cleaned);
  }

  fs.writeFileSync(paths.cleaned, JSON.stringify(cleanedList, null, 2), "utf8");
  fs.writeFileSync(
    paths.duplicates,
    JSON.stringify(duplicateReport, null, 2),
    "utf8"
  );

  console.log(`原始文件：${paths.input}`);
  console.log(`清洗输出：${paths.cleaned}`);
  console.log(`重复报告：${paths.duplicates}`);
  console.log(`总条数：${parsed.length}`);
  console.log(`清洗后可导入条数：${cleanedList.length}`);
  console.log(`重复条数：${duplicateReport.length}`);
}

main().catch((error) => {
  console.error("清洗失败：", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
