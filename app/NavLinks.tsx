"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function getNavClass(active: boolean, primary = false) {
  if (primary) {
    return [
      "inline-flex items-center rounded-full border px-4 py-2 text-sm transition-all duration-200 active:scale-[0.98]",
      active
        ? "border-black bg-black text-white shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
        : "border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950",
    ].join(" ");
  }

  return [
    "rounded-full px-3 py-2 text-sm transition-all duration-200 active:scale-[0.98]",
    active
      ? "bg-gray-900 text-white"
      : "text-gray-700 hover:bg-gray-100 hover:text-gray-950",
  ].join(" ");
}

export default function NavLinks() {
  const pathname = usePathname();

  const isHome =
    pathname === "/" ||
    pathname.startsWith("/category") ||
    pathname.startsWith("/tool");

  const isSearch = pathname.startsWith("/search");
  const isFeatured = pathname.startsWith("/featured");
  const isSubmit = pathname.startsWith("/submit");

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      <Link href="/" className={getNavClass(isHome)}>
        首页
      </Link>

      <Link href="/search" className={getNavClass(isSearch)}>
        搜索
      </Link>

      <Link href="/featured" className={getNavClass(isFeatured)}>
        精选
      </Link>

      <Link href="/submit" className={getNavClass(isSubmit, true)}>
        提交工具
      </Link>
    </nav>
  );
}