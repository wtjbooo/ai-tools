// app/dashboard/layout.tsx
"use client";

import { useAuth } from "@/components/auth/auth-provider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react"; 
import { LayoutDashboard, History, FolderHeart, CreditCard, Settings, Bell, LogOut } from "lucide-react";
import { NotificationPopover } from "@/components/layout/notification-popover";

const NAV_ITEMS = [
  // ... 保持你原有的配置不变 ...
  { label: "总览大盘", href: "/dashboard", icon: LayoutDashboard },
  { label: "生成历史", href: "/dashboard/history", icon: History },
  { label: "灵感收藏", href: "/dashboard/collections", icon: FolderHeart },
  { label: "额度与账单", href: "/dashboard/billing", icon: CreditCard },
  { label: "系统设置", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isReady, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  // ✨ 1. 新增：存储真实未读数量的状态
  const [unreadCount, setUnreadCount] = useState(0);

  // ✨ 2. 新增：拉取未读数量的函数
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        // 过滤出未读的消息，并计算长度
        const count = data.filter((n: any) => !n.isRead).length;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ✨ 3. 新增：当用户数据准备好后，立刻拉取一次数量
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user]);

  // ... 保持你原有的拦截逻辑不变 ...
  useEffect(() => {
    if (isReady && !user) router.push("/");
  }, [isReady, user, router]);

  if (!isReady || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-50"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      <aside className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0 border-r border-zinc-200/60 bg-white/80 backdrop-blur-2xl">
        <div className="h-full px-4 py-6 overflow-y-auto flex flex-col">
          {/* ... Logo 和导航菜单保持不变 ... */}

          {/* 底部操作区 */}
          <div className="pt-6 mt-6 border-t border-zinc-100 space-y-2">
            <button 
              onClick={() => setIsNotificationOpen(true)}
              className="flex w-full items-center p-3 rounded-[16px] text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900 transition-all text-[14px]"
            >
              <Bell className="w-5 h-5" />
              <span className="ml-3">消息通知</span>
              
              {/* ✨ 4. 替换：只有当未读数大于 0 的时候，才显示这个徽标！ */}
              {unreadCount > 0 && (
                <span className="ml-auto bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={logout} className="flex w-full items-center p-3 rounded-[16px] text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all text-[14px]">
              <LogOut className="w-5 h-5" />
              <span className="ml-3">断开连接</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区保持不变 */}
      <main className="flex-1 sm:ml-64 relative min-w-0">
        {/* ... */}
      </main>

      {/* ✨ 5. 替换：将刷新函数传递给子组件 */}
      <NotificationPopover 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
        onStatusChange={fetchUnreadCount}
      />
    </div>
  );
}