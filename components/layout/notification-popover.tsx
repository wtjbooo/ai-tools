'use client';

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Cpu, CreditCard, Sparkles, X, Loader2 } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export function NotificationPopover({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 1. 获取数据的函数 ---
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("加载通知失败", err);
    } finally {
      setLoading(false);
    }
  };

  // 当弹窗打开时，自动刷新一次数据
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // --- 2. 标记全部已读的函数 ---
  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        // 前端同步更新状态，提升用户体验
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("更新失败", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'system': return <Cpu className="w-5 h-5 text-indigo-500" />;
      case 'billing': return <CreditCard className="w-5 h-5 text-red-500" />;
      case 'task': return <Sparkles className="w-5 h-5 text-emerald-500" />;
      default: return <Bell className="w-5 h-5 text-zinc-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pl-64 p-4" onClick={onClose}>
      <div 
        className="relative sm:ml-4 sm:mt-auto sm:mb-20 w-full sm:w-[420px] bg-white/70 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200/50 dark:border-zinc-800/50">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">消息通知</h3>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={markAllAsRead} className="text-sm font-medium text-zinc-500 hover:text-indigo-500 transition-colors flex items-center gap-1.5">
              <CheckCheck className="w-4 h-4" /> 全部已读
            </button>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-900"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* 列表 */}
        <div className="overflow-y-auto flex-1 p-3">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-300" /></div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm font-medium">暂无消息通知</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="relative flex gap-4 p-4 hover:bg-white/60 dark:hover:bg-zinc-800/40 rounded-[24px] transition-all cursor-pointer mb-1">
                {!n.isRead && <div className="absolute left-2.5 top-[28px] w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-lg" />}
                <div className="flex-shrink-0 mt-0.5 ml-1">
                  <div className="p-3 bg-zinc-100/80 dark:bg-zinc-800/50 rounded-2xl">{getIcon(n.type)}</div>
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm font-semibold truncate ${n.isRead ? 'text-zinc-400' : 'text-zinc-900'}`}>{n.title}</h4>
                    <span className="text-[10px] text-zinc-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[13px] text-zinc-500 line-clamp-2">{n.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}