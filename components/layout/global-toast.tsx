'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, X, Cpu, CreditCard, Sparkles } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
}

export function GlobalToast() {
  const [latestMsg, setLatestMsg] = useState<Notification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname(); 

  useEffect(() => {
    const checkMessages = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          const newUnread = data.find((n: Notification) => !n.isRead);
          
          if (newUnread) {
            const poppedIds = JSON.parse(localStorage.getItem('popped_notifications') || '[]');
            
            if (!poppedIds.includes(newUnread.id)) {
              setLatestMsg(newUnread);
              setIsVisible(true);
              
              poppedIds.push(newUnread.id);
              localStorage.setItem('popped_notifications', JSON.stringify(poppedIds));

              setTimeout(() => {
                setIsVisible(false);
              }, 5000);
            }
          }
        }
      } catch (e) {
        console.error("弹窗检测失败", e);
      }
    };

    checkMessages();
  }, [pathname]); 

  const getIcon = (type: string) => {
    switch (type) {
      case 'system': return <Cpu className="w-5 h-5 text-indigo-500" />;
      case 'billing': return <CreditCard className="w-5 h-5 text-red-500" />;
      case 'task': return <Sparkles className="w-5 h-5 text-emerald-500" />;
      default: return <Bell className="w-5 h-5 text-zinc-500" />;
    }
  };

  if (!isVisible || !latestMsg) return null;

  return (
    // ✨ 这里的定位已经改成了右下角，并且动画是从底部向上浮现
    <div className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="relative flex items-start gap-4 w-[380px] p-4 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-2xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
        
        <div className="flex-shrink-0 mt-0.5">
          <div className="p-2 bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl">
            {getIcon(latestMsg.type)}
          </div>
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            {latestMsg.title}
          </h4>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
            {latestMsg.content}
          </p>
        </div>

        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-900 transition-colors bg-transparent rounded-full hover:bg-zinc-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}