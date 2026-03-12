import Link from "next/link";

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
  children: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-md transition-all duration-300 ${
        subtle
          ? "border border-black/7 bg-white/58 text-gray-500"
          : "border border-black/9 bg-white/86 text-gray-700"
      }`}
    >
      {children}
    </span>
  );
}

export default function ToolCard({ tool }: { tool: ToolCardData }) {
  const showPricing =
    tool.pricing && tool.pricing !== "unknown" && tool.pricing !== "未知";

  const tags = (tool.tags ?? []).map((item) => item.tag.name).slice(0, 2);

  const logoSrc =
    tool.logoUrl && tool.logoUrl.trim() !== ""
      ? tool.logoUrl
      : "/default-tool-icon.png";

  const showOutClicks = typeof tool.outClicks === "number" && tool.outClicks > 0;
  const showViews = typeof tool.views === "number" && tool.views > 0;

  return (
    <Link
      href={`/tool/${tool.slug}`}
      className="group relative block overflow-hidden rounded-[24px] border border-black/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(249,250,251,0.94))] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.045)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-black/10 hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)] active:scale-[0.994] sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.08),transparent_32%),radial-gradient(circle_at_18%_100%,rgba(168,85,247,0.06),transparent_26%)]" />
      </div>

      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-[17px] font-semibold tracking-tight text-gray-950 transition-colors duration-300 group-hover:text-black sm:text-[18px]">
                {tool.name}
              </div>

              {tool.featured ? <MetaPill>推荐</MetaPill> : null}
            </div>

            <div className="text-[13px] text-gray-500">
              {tool.category?.name ?? "未分类"}
            </div>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-black/6 bg-white/82 shadow-[0_5px_16px_rgba(15,23,42,0.045)] transition-all duration-300 group-hover:bg-white group-hover:shadow-[0_8px_22px_rgba(15,23,42,0.07)]">
            <img
              src={logoSrc}
              alt={`${tool.name} logo`}
              width={24}
              height={24}
              className="h-6 w-6 rounded-md object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>

        <p className="line-clamp-2 min-h-[52px] text-[14px] leading-6 text-gray-600 sm:min-h-[56px]">
          {tool.description || "暂无简介"}
        </p>

        <div className="flex flex-wrap gap-2">
          {showOutClicks ? <MetaPill>官网点击 {tool.outClicks}</MetaPill> : null}
          {showViews ? <MetaPill>浏览 {tool.views}</MetaPill> : null}
          {showPricing ? <MetaPill>{tool.pricing}</MetaPill> : null}

          {tags.map((tag) => (
            <MetaPill key={tag} subtle>
              {tag}
            </MetaPill>
          ))}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[14px] font-medium text-gray-700 transition-colors duration-300 group-hover:text-gray-950">
            查看详情
          </span>
          <span className="text-sm text-gray-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-gray-700">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}