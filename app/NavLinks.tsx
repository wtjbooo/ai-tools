"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  match?: "exact" | "prefix";
  badge?: string;
  tone?: "default" | "feature";
};

const NAV_ITEMS: NavItem[] = [
  { label: "首页", href: "/", match: "exact" },
  { label: "精选推荐", href: "/featured", match: "prefix" },
  { label: "最新收录", href: "/latest", match: "prefix" },
  { label: "热门工具", href: "/popular", match: "prefix" },
  {
    label: "反向提示词",
    href: "/reverse-prompt",
    match: "prefix",
    badge: "新",
    tone: "feature",
  },
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

function getItemClassName(
  active: boolean,
  tone: NavItem["tone"] = "default",
) {
  const base =
    "group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10";

  if (active) {
    return [
      base,
      "bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]",
    ].join(" ");
  }

  if (tone === "feature") {
    return [
      base,
      "border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.90))] text-gray-800 hover:-translate-y-0.5 hover:border-black/12 hover:bg-white hover:text-gray-950",
    ].join(" ");
  }

  return [
    base,
    "text-gray-700 hover:-translate-y-0.5 hover:bg-white/82 hover:text-gray-950",
  ].join(" ");
}

function getBadgeClassName(active: boolean) {
  return [
    "hidden items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex",
    active
      ? "bg-white/12 text-white"
      : "border border-black/8 bg-white/90 text-gray-500",
  ].join(" ");
}

export default function NavLinks({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label="Primary">
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={getItemClassName(active, item.tone)}
            >
              <span>{item.label}</span>

              {item.badge ? (
                <span className={getBadgeClassName(active)}>{item.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}