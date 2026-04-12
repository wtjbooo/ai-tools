import Link from "next/link";

type NavItem = {
  label: string;
  href: string;
  badge?: string;
};

const DEFAULT_ITEMS: NavItem[] = [
  { label: "首页", href: "/" },
  { label: "搜索", href: "/search" },
  { label: "精选", href: "/featured" },
  { label: "反向提示词", href: "/reverse-prompt", badge: "NEW" },
  { label: "提交工具", href: "/submit" },
];

function isActive(currentPath: string, href: string) {
  if (href === "/") {
    return currentPath === "/";
  }

  return (
    currentPath === href ||
    currentPath.startsWith(`${href}/`) ||
    currentPath.startsWith(`${href}?`)
  );
}

export default function SiteHeader({
  currentPath = "/",
  items = DEFAULT_ITEMS,
}: {
  currentPath?: string;
  items?: NavItem[];
}) {
  return (
    <header className="sticky top-0 z-40 mb-5 sm:mb-7">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-[24px] border border-black/8 bg-white/78 px-4 py-3 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/72 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/"
              className="group inline-flex min-w-0 items-center gap-3 transition-all duration-200 hover:opacity-95"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                <span className="text-sm font-semibold tracking-tight text-gray-950">
                  X
                </span>
              </div>

              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold tracking-tight text-gray-950">
                  XAira
                </div>
                <div className="truncate text-xs text-gray-500">
                  Curated tools for modern workflows
                </div>
              </div>
            </Link>

            <nav
              className="flex flex-wrap items-center gap-2"
              aria-label="Primary navigation"
            >
              {items.map((item) => {
                const active = isActive(currentPath, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-all duration-200 active:scale-[0.98]",
                      active
                        ? "bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                        : "border border-black/8 bg-white/76 text-gray-700 hover:-translate-y-0.5 hover:border-black/12 hover:bg-white hover:text-gray-950",
                    ].join(" ")}
                  >
                    <span>{item.label}</span>

                    {item.badge ? (
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-[0.14em]",
                          active
                            ? "bg-white/14 text-white"
                            : "border border-black/8 bg-black/[0.03] text-gray-500",
                        ].join(" ")}
                      >
                        {item.badge}
                      </span>
                    ) : null}
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