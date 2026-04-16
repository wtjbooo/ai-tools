// app/dashboard/layout.tsx
"use client";

import { useAuth } from "@/components/auth/auth-provider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { 
  LayoutDashboard, 
  History, 
  FolderHeart, 
  CreditCard, 
  Settings, 
  Bell,
  LogOut
} from "lucide-react";

const NAV_ITEMS = [
  { label: "总览大盘", href: "/dashboard", icon: LayoutDashboard },
  { label: "生成历史", href: "/dashboard/history", icon: History },
  { label: "灵感收藏", href: "/dashboard/collections", icon: FolderHeart },
  { label: "额度与账单", href: "/dashboard/billing", icon: CreditCard },
  { label: "系统设置", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isReady, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // 如果已准备好且未登录，重定向回首页
  useEffect(() => {
    if (isReady && !user) {
      router.push("/");
    }
  }, [isReady, user, router]);

  if (!isReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* ✨ 左侧高级导航栏 ✨ */}
      <aside className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0 border-r border-zinc-200/60 bg-white/80 backdrop-blur-2xl">
        <div className="h-full px-4 py-6 overflow-y-auto flex flex-col">
          {/* 顶部 Logo & 用户简影 */}
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-zinc-800 to-zinc-950 shadow-md">
              <img src="/logo.svg" alt="Logo" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-zinc-900 tracking-tight">XAira 工作台</span>
              <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                节点已连接
              </span>
            </div>
          </div>

          {/* 导航菜单 */}
          <ul className="space-y-1.5 font-medium flex-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center p-3 rounded-[16px] transition-all duration-300 group ${
                      isActive
                        ? "bg-zinc-900 text-white shadow-[0_8px_20px_rgba(24,24,27,0.15)]"
                        : "text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900"
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                    <span className="ml-3 text-[14px]">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* 底部操作区 */}
          <div className="pt-6 mt-6 border-t border-zinc-100 space-y-2">
            <button className="flex w-full items-center p-3 rounded-[16px] text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900 transition-all text-[14px]">
              <Bell className="w-5 h-5" />
              <span className="ml-3">消息通知</span>
              <span className="ml-auto bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">3</span>
            </button>
            <button 
              onClick={logout}
              className="flex w-full items-center p-3 rounded-[16px] text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all text-[14px]"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">断开连接</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ✨ 右侧主内容区 ✨ */}
      <main className="flex-1 sm:ml-64 relative min-w-0">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />
        <div className="relative p-6 sm:p-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}