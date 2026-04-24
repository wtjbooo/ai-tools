'use client'; // 声明客户端组件，因为我们使用了 useState 和 usePathname

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Library, 
  CreditCard, 
  Settings, 
  Bell, 
  Sparkles 
} from 'lucide-react';

// 引入我们上一步做好的通知面板组件
// 注意：请确保上一步的 notification-popover.tsx 放在了 components/layout/ 目录下
import { NotificationPopover } from '@/components/layout/notification-popover';

// ==========================================
// 1. 导航菜单配置
// ==========================================
const navItems = [
  { name: '总览大盘', href: '/dashboard', icon: LayoutDashboard },
  { name: '灵感收藏', href: '/dashboard/collections', icon: Library },
  { name: '资产与订阅', href: '/dashboard/billing', icon: CreditCard },
  { name: '偏好设置', href: '/dashboard/settings', icon: Settings },
];

// ==========================================
// 2. 侧边栏主组件
// ==========================================
export function Sidebar() {
  const pathname = usePathname(); // 获取当前路由，用于高亮当前选中的菜单
  const [isNotificationOpen, setIsNotificationOpen] = useState(false); // 控制通知弹窗的状态

  return (
    <>
      <aside className="fixed top-0 left-0 h-screen w-64 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl flex flex-col justify-between border-r border-zinc-200/50 dark:border-zinc-800/50 z-40 transition-all">
        
        {/* --- 上半部分：Logo 与导航菜单 --- */}
        <div className="p-4 sm:p-6">
          {/* Logo 区域 */}
          <div className="flex items-center gap-2 px-2 mb-8 cursor-pointer">
            <div className="p-1.5 bg-zinc-900 dark:bg-zinc-100 rounded-xl">
              <Sparkles className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              XAira
            </span>
          </div>

          {/* 导航列表 */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-zinc-200/50 dark:border-zinc-800/50' 
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-500' : ''}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* --- 下半部分：底部操作区 (消息通知) --- */}
        <div className="p-4 sm:p-6 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <button 
            onClick={() => setIsNotificationOpen(true)}
            className="relative flex items-center gap-3 px-3 py-2.5 w-full rounded-2xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-200 text-sm font-medium group"
          >
            <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>消息通知</span>
            
            {/* 未读消息红点 Badge */}
            <span className="absolute right-3 bg-indigo-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              3
            </span>
          </button>
        </div>
      </aside>

      {/* --- 挂载通知弹窗组件 --- */}
      {/* 将其放在 Sidebar 旁边，确保不受 flex 布局限制 */}
      <NotificationPopover 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
      />
    </>
  );
}