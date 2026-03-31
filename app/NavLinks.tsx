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
  if (item.match === "exact") return pathname === item.href;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function getItemClassName(active: boolean, tone: NavItem["tone"] = "default") {
  // 基础样式：取消缩放动画，改用极其细微的位移
  const base =
    "group relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[14px] font-medium transition-all duration-300 focus:outline-none";

  if (active) {
    // 激活态：高级黑，带一点点光泽感和投影
    return [
      base,
      "text-zinc-950 font-semibold",
    ].join(" ");
  }

  if (tone === "feature") {
    // 特色项：轻微强调，但不抢主色
    return [
      base,
      "text-zinc-600 hover:text-zinc-950",
    ].join(" ");
  }

  return [
    base,
    "text-zinc-500 hover:text-zinc-950",
  ].join(" ");
}

export default function NavLinks({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav 
      className={`${className} relative flex items-center overflow-x-auto overflow-y-hidden scrollbar-hide`}
      style={{ 
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
      }}
      aria-label="Primary"
    >
      <div className="flex items-center gap-2 px-4 sm:gap-1 sm:px-0">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={getItemClassName(active, item.tone)}
            >
              <span className="relative z-10">{item.label}</span>
              
              {/* 激活态的下划线/底色：这里用 Apple 风格的指示线或极其浅的背景 */}
              {active && (
                <span className="absolute inset-x-3 bottom-1.5 h-[1.5px] bg-zinc-950 rounded-full" />
              )}

              {item.badge && (
                <span className={`
                  ml-0.5 inline-flex h-1.5 w-1.5 rounded-full 
                  ${active ? 'bg-zinc-950' : 'bg-zinc-400'}
                `} />
              )}
            </Link>
          );
        })}
      </div>

      {/* 注入一个全局 CSS 隐藏滚动条，避免在 layout 里写太多 */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </nav>
  );
}