// app/dashboard/billing/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useUpgradeModal } from "@/contexts/UpgradeModalContext";
import { CreditCard, Zap, Sparkles, Receipt, Loader2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

interface BillingData {
  planName: string;
  isPro: boolean;
  quota: { used: number; total: number; remaining: number };
  history: Array<{
    id: string;
    title: string;
    type: string;
    cost: number;
    date: string;
    time: string;
  }>;
}

const typeMap: Record<string, string> = {
  reverse: "图像反推",
  enhance: "魔法扩写",
  search: "全网搜索",
  checkin: "系统福利", // 🚀 新增签到的流水标签
};

export default function BillingPage() {
  const { openModal } = useUpgradeModal();
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBilling() {
      try {
        // 🚀 核心补丁：加时间戳并强制不缓存，彻底打穿浏览器缓存！
        const res = await fetch(`/api/user/billing?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) setData(json);
        }
      } catch (error) {
        console.error("加载账单失败:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBilling();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-zinc-500 font-medium">正在拉取账单与额度明细...</p>
      </div>
    );
  }

  const percent = Math.min((data.quota.used / data.quota.total) * 100, 100);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* 头部标题 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          额度与账单 <span className="text-zinc-300 font-light">/</span> 
          <span className="text-zinc-400 text-lg font-medium">资产与订阅</span>
        </h1>
        <p className="text-sm text-zinc-500 mt-1">管理你的算力订阅与积分消耗明细。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左侧：订阅计划与额度概览 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-zinc-100 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 border border-zinc-100">
                <CreditCard className="w-6 h-6" />
              </div>
              {data.isPro && (
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold tracking-widest rounded-full">
                  当前生效
                </span>
              )}
            </div>
            
            <h3 className="text-zinc-500 text-sm font-medium mb-1">当前计划</h3>
            <div className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              {data.planName}
              {data.isPro && <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />}
            </div>

            {!data.isPro && (
              <button 
                onClick={() => openModal()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 transition-all active:scale-95"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                升级获取无限灵感
              </button>
            )}
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-zinc-100">
             <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-zinc-500 text-sm font-medium mb-1">本月已用</p>
                  <div className="text-3xl font-black text-zinc-900 tracking-tight">
                    {data.quota.used} <span className="text-lg text-zinc-400 font-medium tracking-normal">/ {data.quota.total}</span>
                  </div>
                </div>
                <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">
                  剩余 {data.quota.remaining}
                </div>
             </div>

             <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-1000"
                  style={{ width: `${percent}%` }}
                />
             </div>
             <p className="text-xs text-zinc-400 mt-4 font-medium">算力将于次月 1 号凌晨自动重置</p>
          </div>
        </div>

        {/* 右侧：积分消耗明细 (流水表) */}
        <div className="lg:col-span-2 bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-zinc-100 flex flex-col overflow-hidden">
          <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-zinc-400" />
              账单流水明细
            </h3>
            <span className="text-xs font-medium text-zinc-500 bg-white px-3 py-1 rounded-full border border-zinc-200 shadow-sm">
              最近 50 条记录
            </span>
          </div>

          <div className="p-4 sm:p-8 flex-1 overflow-y-auto">
            {data.history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-zinc-400">
                <p className="text-sm font-medium">本月暂无消耗记录</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.history.map((item) => {
                  // 🚀 核心渲染逻辑：判断是收入还是支出
                  const isIncome = item.cost < 0; 
                  const displayValue = isIncome ? `+ ${Math.abs(item.cost)}` : `- ${item.cost}`;
                  
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-4 rounded-[20px] hover:bg-zinc-50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-zinc-100/80 text-zinc-500">
                          <span className="text-xs font-bold leading-none mb-1">{item.date.split('-')[2]}</span>
                          <span className="text-[10px] font-medium opacity-60 leading-none">{item.date.split('-')[1]}月</span>
                        </div>
                        
                        <div>
                          <h4 className="text-[15px] font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                              {typeMap[item.type.toLowerCase()] || item.type}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-mono">{item.time}</span>
                          </div>
                        </div>
                      </div>

                      {/* 🚀 金额渲染：绿色加号，深色减号 */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-4">
                        <span className={`text-sm font-bold ${isIncome ? 'text-emerald-500' : 'text-zinc-900'}`}>
                          {displayValue}
                        </span>
                        {isIncome ? (
                           <ArrowDownToLine className="w-4 h-4 text-emerald-500 opacity-80" />
                        ) : (
                           <Zap className="w-4 h-4 text-amber-500 fill-current opacity-80" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}