'use client'; // 由于使用了 useState，我们需要声明这是一个客户端组件

import React, { useState } from 'react';
import { Bell, CheckCheck, Cpu, CreditCard, Sparkles, X } from 'lucide-react';

// ==========================================
// 1. 类型定义
// ==========================================
interface Notification {
  id: string;
  type: 'system' | 'billing' | 'task';
  title: string;
  content: string;
  time: string;
  isRead: boolean;
}

// ==========================================
// 2. 逼真的 Mock 数据 (模拟后期从 API 获取的数据)
// ==========================================
const initialMockData: Notification[] = [
  {
    id: '1',
    type: 'system',
    title: '系统升级完成',
    content: 'XAira 现已全量接入 Sora-Pro 视频生成模型，快去体验吧！',
    time: '10分钟前',
    isRead: false,
  },
  {
    id: '2',
    type: 'billing',
    title: '资产额度预警',
    content: '您的当前算力积分已不足 20%，为避免影响使用，请及时充值。',
    time: '2小时前',
    isRead: false,
  },
  {
    id: '3',
    type: 'task',
    title: '魔法扩写已完成',
    content: '您提交的“赛博朋克城市”提示词扩写任务已完成，点击查看结果。',
    time: '昨天',
    isRead: true,
  },
];

// ==========================================
// 3. 核心组件
// ==========================================
export function NotificationPopover({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initialMockData);

  // 统计未读消息数量
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // 动作：将所有消息标记为已读
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  // 动作：根据类型返回对应的图标与颜色
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'system': return <Cpu className="w-5 h-5 text-indigo-500" />;
      case 'billing': return <CreditCard className="w-5 h-5 text-red-500" />;
      case 'task': return <Sparkles className="w-5 h-5 text-emerald-500" />;
    }
  };

  // 如果状态为不展开，则什么都不渲染
  if (!isOpen) return null;

  return (
    // 外层透明遮罩，监听点击事件以关闭浮窗 (z-50 确保在最顶层)
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-start sm:pl-64 sm:pt-auto p-4 transition-opacity" 
      onClick={onClose}
    >
      
      {/* 弹窗主体：
        - 阻止点击事件冒泡，防止点击面板内部时触发外部的 onClose
        - 核心样式：玻璃拟态 (backdrop-blur-2xl) + 极简圆角 (rounded-[32px])
      */}
      <div 
        className="relative sm:ml-4 sm:mt-auto sm:mb-20 w-full sm:w-[420px] bg-white/70 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[85vh] transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* === 顶部控制栏 === */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200/50 dark:border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl">
              <Bell className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">消息通知</h3>
            {unreadCount > 0 && (
              <span className="bg-indigo-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={markAllAsRead}
              className="text-sm font-medium text-zinc-500 hover:text-indigo-500 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              全部已读
            </button>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors bg-transparent rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* === 消息列表区域 === */}
        <div className="overflow-y-auto flex-1 p-3 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">这里很安静，暂无新消息</div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id}
                className="group relative flex gap-4 p-4 hover:bg-white/60 dark:hover:bg-zinc-800/40 rounded-[24px] transition-all cursor-pointer mb-1"
              >
                {/* 未读提示蓝点 */}
                {!notification.isRead && (
                  <div className="absolute left-2.5 top-[28px] w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                )}
                
                {/* 左侧图标 */}
                <div className="flex-shrink-0 mt-0.5 ml-1">
                  <div className="p-3 bg-zinc-100/80 dark:bg-zinc-800/50 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                    {getIcon(notification.type)}
                  </div>
                </div>

                {/* 右侧文本内容 */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className={`text-sm font-semibold truncate ${notification.isRead ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-[11px] font-medium text-zinc-400 whitespace-nowrap ml-2">
                      {notification.time}
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {notification.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}