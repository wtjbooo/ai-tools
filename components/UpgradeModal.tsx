"use client";

import { useEffect, useState } from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-0">
      {/* 模糊背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 弹窗主体 */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[32px] bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50" />
        
        <div className="relative p-6 sm:p-10">
          {/* 关闭按钮 */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <span className="text-2xl">✨</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              今日免费额度已用完
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
              您已体验了最顶级的 AI 视觉引擎与大模型能力。<br/>
              解锁 PRO 会员，即可突破限制，享受无缝的创作心流。
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {/* 方案 1：按次充值 (流量包) */}
            <div className="relative flex flex-col rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">加油包</h3>
                <p className="text-xs text-gray-500 mt-1">适合偶尔使用的轻度创作者</p>
              </div>
              <div className="mb-6 flex items-baseline text-3xl font-bold text-gray-900">
                ¥9.9
                <span className="ml-1 text-sm font-medium text-gray-500">/ 50次</span>
              </div>
              <ul className="mb-6 space-y-3 text-sm text-gray-600 flex-1">
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> 永不过期</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> 支持所有高级大模型</li>
              </ul>
              <button className="w-full rounded-full bg-blue-50 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100">
                购买加油包
              </button>
            </div>

            {/* 方案 2：包月会员 */}
            <div className="relative flex flex-col rounded-[24px] border-2 border-blue-600 bg-blue-600 p-6 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white">
                超值推荐
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">PRO 连续包月</h3>
                <p className="text-xs text-blue-100 mt-1">生产力工具的终极形态</p>
              </div>
              <div className="mb-6 flex items-baseline text-3xl font-bold text-white">
                ¥39
                <span className="ml-1 text-sm font-medium text-blue-200">/ 月</span>
              </div>
              <ul className="mb-6 space-y-3 text-sm text-blue-50 flex-1">
                <li className="flex items-center gap-2"><span className="text-white">✓</span> 每日 1000 次调用额度</li>
                <li className="flex items-center gap-2"><span className="text-white">✓</span> 专属极速解析通道</li>
                <li className="flex items-center gap-2"><span className="text-white">✓</span> 优先体验新功能</li>
              </ul>
              <button className="w-full rounded-full bg-white py-2.5 text-sm font-bold text-blue-600 transition-colors hover:bg-gray-50">
                开通包月会员
              </button>
            </div>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-400">
            * 支付系统对接中，敬请期待...
          </div>
        </div>
      </div>
    </div>
  );
}