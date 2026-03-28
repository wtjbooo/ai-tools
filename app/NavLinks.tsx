"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  match?: "exact" | "prefix";
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "首页", href: "/", match: "exact" },
  { label: "精选推荐", href: "/featured", match: "prefix" },
  { label: "最新收录", href: "/latest", match: "prefix" },
  { label: "热门工具", href: "/popular", match: "prefix" },
  { label: "反向提示词", href: "/reverse-prompt", match: "prefix", badge: "NEW" },
  { label: "提交工具", href: "/submit", match: "prefix" },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }

  if (item.href === "/") {
    return pathname === "/";
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function NavLinks({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label="Primary">
      <div className="flex flex-wrap items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-all duration-200",
                active
                  ? "bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                  : "border border-black/8 bg-white/82 text-gray-700 backdrop-blur-md hover:-translate-y-0.5 hover:border-black/12 hover:bg-white hover:text-gray-950",
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
      </div>
    </nav>
  );
}