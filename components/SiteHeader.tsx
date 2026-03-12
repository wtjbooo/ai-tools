import Link from "next/link";

type NavItem = {
  label: string;
  href: string;
};

const DEFAULT_ITEMS: NavItem[] = [
  { label: "首页", href: "/" },
  { label: "精选推荐", href: "/featured" },
  { label: "搜索", href: "/search" },
  { label: "提交工具", href: "/submit" },
];

export default function SiteHeader({
  currentPath = "/",
  items = DEFAULT_ITEMS,
}: {
  currentPath?: string;
  items?: NavItem[];
}) {
  return (
    <header className="sticky top-0 z-40 mb-5 sm:mb-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[22px] border border-black/7 bg-white/78 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-3 transition-all duration-200 hover:opacity-90"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                  <span className="text-sm font-semibold tracking-tight text-gray-950">
                    AI
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="text-[15px] font-semibold tracking-tight text-gray-950">
                    AI 工具目录
                  </div>
                  <div className="text-xs text-gray-500">
                    简约、高效、持续收录
                  </div>
                </div>
              </Link>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              {items.map((item) => {
                const active =
                  item.href === "/"
                    ? currentPath === "/"
                    : currentPath === item.href ||
                      currentPath.startsWith(`${item.href}/`) ||
                      currentPath.startsWith(`${item.href}?`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "inline-flex items-center rounded-full px-3.5 py-2 text-sm transition-all duration-200 active:scale-[0.98]",
                      active
                        ? "border border-black bg-black text-white"
                        : "border border-black/8 bg-white/72 text-gray-700 hover:-translate-y-0.5 hover:border-black/12 hover:bg-white hover:text-gray-950",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}