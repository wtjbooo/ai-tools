// app/NavLinks.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 💡 核心升级：精简导航，合并复杂的 AI 功能为单一的“灵感套件”
const NAV_ITEMS = [
  { label: "首页", href: "/" },
  { label: "精选推荐", href: "/featured" },
  { label: "最新收录", href: "/latest" },
  { label: "热门工具", href: "/popular" },
  { label: "AI 灵感套件", href: "/workspace", badge: "HOT" },
  { label: "提交工具", href: "/submit" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {NAV_ITEMS.map((item) => {
        // 智能判断当前页面路径，给对应按钮打上黑底高亮
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] sm:text-[14px] font-medium transition-all duration-200 ${
              isActive
                ? "bg-black text-white shadow-md"
                : "text-gray-600 hover:bg-black/5 hover:text-gray-900"
            }`}
          >
            {item.label}
            {item.badge && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-blue-50 text-blue-600 border border-blue-100"
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}