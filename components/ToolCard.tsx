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

// 升级版：毛玻璃/磨砂质感的标签
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
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide transition-all duration-300",
        subtle
          ? "bg-zinc-100/70 text-zinc-500 group-hover:bg-zinc-100"
          : "border border-zinc-200/50 bg-white/80 backdrop-blur-md text-zinc-700 shadow-[0_2px_8px_rgba(0,0,0,0.02)]",
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
      // 核心卡片容器：引入了阻尼动画 ease-[cubic-bezier(0.23,1,0.32,1)] 和更清透的阴影
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1.5 hover:border-black/[0.08] hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.08)] active:scale-[0.98] sm:p-6"
    >
      {/* 极弱的渐变光晕，鼠标悬浮时慢慢浮现 */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.04),transparent_40%),radial-gradient(circle_at_20%_100%,rgba(168,85,247,0.03),transparent_30%)]" />
      </div>

      <div className="relative flex h-full flex-col">
        <div className="flex items-start gap-4">
          {/* iOS 图标风格的 Logo 框：细微内圈、圆角调优、独立悬浮放大 */}
          <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] border border-black/[0.03] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.02] transition-transform duration-500 ease-out group-hover:scale-105 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <img
              src={logoSrc}
              alt={`${tool.name} logo`}
              width={32}
              height={32}
              className="h-8 w-8 rounded-[8px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-[17px] font-semibold tracking-tight text-zinc-900 transition-colors duration-300 group-hover:text-black sm:text-[18px]">
                {tool.name}
              </div>

              {tool.featured ? <MetaPill>精选</MetaPill> : null}
            </div>

            <div className="mt-1 text-[13px] font-medium text-zinc-400 transition-colors duration-300 group-hover:text-zinc-500">{categoryName}</div>
          </div>
        </div>

        {/* 简介文本：行高微调，颜色选用更有质感的 zinc-500 */}
        <p className="mt-4 line-clamp-3 min-h-[72px] text-[14px] leading-relaxed text-zinc-500 transition-colors duration-300 group-hover:text-zinc-600">
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

        {/* 底部信息栏：加上了箭头动画 */}
        <div className="mt-auto flex items-center justify-between border-t border-black/[0.04] pt-4 mt-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-zinc-400 transition-colors duration-300 group-hover:text-zinc-500">
            {showOutClicks ? <MetricText>官网点击 {tool.outClicks}</MetricText> : null}
            {showViews ? <MetricText>浏览 {tool.views}</MetricText> : null}
          </div>

          <span className="inline-flex items-center text-[13px] font-medium text-zinc-400 transition-colors duration-300 group-hover:text-zinc-900">
            查看详情
            {/* 弹簧效果的箭头位移 */}
            <span className="ml-1 inline-block transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}