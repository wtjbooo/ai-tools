import Link from "next/link";
import type { ReactNode } from "react";

type ToolTagItem = {
  tag: {
    name: string;
  };
};

type ToolCardCategory = {
  name: string;
};

export type ToolCardData = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  pricing?: string | null;
  outClicks?: number | null;
  views?: number | null;
  featured?: boolean | null;
  category?: ToolCardCategory | null;
  tags?: ToolTagItem[];
};

function MetaPill({
  children,
  subtle = false,
}: {
  children: ReactNode;
  subtle?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-300",
        subtle
          ? "border border-black/7 bg-gray-50 text-gray-500"
          : "border border-black/8 bg-white text-gray-700",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function isWeakDescription(text?: string | null) {
  if (!text) return true;
  const value = text.trim();
  if (!value) return true;

  return [/这里写/i, /待补充/i, /测试/i, /演示/i, /暂无简介/i].some((pattern) =>
    pattern.test(value),
  );
}

function getDisplayDescription(
  name: string,
  categoryName: string,
  description?: string | null,
) {
  if (isWeakDescription(description)) {
    return `这是一款归类于「${categoryName}」方向的 AI 工具。`;
  }

  return description!.trim();
}

function getPricingText(pricing?: string | null) {
  if (!pricing) return null;
  const value = pricing.trim();
  if (!value || value === "unknown" || value === "未知") return null;
  return value;
}

function MetricText({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

export default function ToolCard({ tool }: { tool: ToolCardData }) {
  const categoryName = tool.category?.name ?? "AI 工具";
  const pricingText = getPricingText(tool.pricing);
  const tags = (tool.tags ?? []).map((item) => item.tag.name).slice(0, 2);

  const logoSrc =
    tool.logoUrl && tool.logoUrl.trim() !== ""
      ? tool.logoUrl
      : "/default-tool-icon.png";

  const showOutClicks =
    typeof tool.outClicks === "number" && tool.outClicks > 0;
  const showViews = typeof tool.views === "number" && tool.views > 0;

  return (
    <Link
      href={`/tool/${tool.slug}`}
      className="group relative block h-full overflow-hidden rounded-[26px] border border-black/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,250,251,0.95))] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.045)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-black/10 hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)] active:scale-[0.994] sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.07),transparent_30%),radial-gradient(circle_at_16%_100%,rgba(168,85,247,0.05),transparent_24%)]" />
      </div>

      <div className="relative flex h-full flex-col">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-black/6 bg-white/88 shadow-[0_6px_18px_rgba(15,23,42,0.045)] transition-all duration-300 group-hover:bg-white group-hover:shadow-[0_10px_24px_rgba(15,23,42,0.065)]">
            <img
              src={logoSrc}
              alt={`${tool.name} logo`}
              width={28}
              height={28}
              className="h-7 w-7 rounded-md object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-[17px] font-semibold tracking-tight text-gray-950 transition-colors duration-300 group-hover:text-black sm:text-[18px]">
                {tool.name}
              </div>

              {tool.featured ? <MetaPill>精选</MetaPill> : null}
            </div>

            <div className="mt-1 text-[13px] text-gray-500">{categoryName}</div>
          </div>
        </div>

        <p className="mt-4 line-clamp-3 min-h-[72px] text-[14px] leading-6 text-gray-600">
          {getDisplayDescription(tool.name, categoryName, tool.description)}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {pricingText ? <MetaPill>{pricingText}</MetaPill> : null}

          {tags.map((tag) => (
            <MetaPill key={tag} subtle>
              {tag}
            </MetaPill>
          ))}

          {!pricingText && tags.length === 0 ? (
            <MetaPill subtle>{categoryName}</MetaPill>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-black/6 pt-3.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-500">
            {showOutClicks ? <MetricText>官网点击 {tool.outClicks}</MetricText> : null}
            {showViews ? <MetricText>浏览 {tool.views}</MetricText> : null}
          </div>

          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-gray-700 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-gray-950">
            查看详情
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}