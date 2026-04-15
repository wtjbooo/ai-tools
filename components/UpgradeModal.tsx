"use client";

import { useEffect, useState } from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string } | null>(null);
  // 💡 新增：控制当前显示哪种支付方式的开关
  const [payMethod, setPayMethod] = useState<"wechat" | "alipay">("wechat");

  useEffect(() => {
    if (!isOpen) {
      setSelectedPlan(null);
      setPayMethod("wechat"); // 关闭时重置为微信
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-0">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-[32px] bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50" />
        
        <div className="relative p-6 sm:p-10">
          <button onClick={onClose} className="absolute top-6 right-6 rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-900 z-10">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* ==================================== */}
          {/* 视图 A：显示个人收款码与联系方式 */}
          {/* ==================================== */}
          {selectedPlan ? (
            <div className="flex flex-col items-center justify-center py-4 animate-in slide-in-from-right-8 duration-300">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">扫码支付 & 联系站长</h2>
              <p className="mt-2 text-sm text-gray-500 text-center px-4">
                您选择了：<span className="font-bold text-blue-600">{selectedPlan.name}</span>
              </p>
              
              {/* 💡 支付方式切换器 */}
              <div className="mt-6 flex items-center rounded-full bg-gray-100 p-1">
                <button
                  onClick={() => setPayMethod("wechat")}
                  className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                    payMethod === "wechat" ? "bg-[#07C160] text-white shadow-md" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  微信支付
                </button>
                <button
                  onClick={() => setPayMethod("alipay")}
                  className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                    payMethod === "alipay" ? "bg-[#1677FF] text-white shadow-md" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  支付宝
                </button>
              </div>

              {/* 动态显示对应的二维码 */}
              <div className="mt-6 relative flex items-center justify-center rounded-2xl bg-white p-4 shadow-[0_0_40px_rgba(0,0,0,0.08)] border border-gray-100">
                <img 
                  src={payMethod === "wechat" ? "/wechat-pay.png" : "/alipay-pay.png"} 
                  alt={payMethod === "wechat" ? "微信收款码" : "支付宝收款码"} 
                  className="w-[200px] h-[200px] object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=请在public文件夹放入${payMethod}-pay.png`;
                  }}
                />
              </div>

              <div className="mt-6 flex items-baseline text-4xl font-bold text-gray-900">
                <span className="text-2xl mr-1">¥</span>{selectedPlan.price}
              </div>

              {/* 引导用户加微信 */}
              <div className="mt-8 w-full rounded-[24px] bg-blue-50 p-6 border border-blue-100">
                <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">!</span>
                  支付后如何到账？
                </h4>
                <ul className="space-y-2 text-[13px] text-blue-800/80">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span> 
                    请添加站长微信：<span className="font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200 select-all">这里填你的微信号</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span> 
                    发送支付截图及您的注册邮箱。
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span> 
                    站长将在 5 分钟内为您手动充值算力额度。
                  </li>
                </ul>
              </div>

              <button onClick={() => setSelectedPlan(null)} className="mt-8 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-4">
                返回重选套餐
              </button>
            </div>
          ) : (
            
          /* ==================================== */
          /* 视图 B：显示套餐列表 */
          /* ==================================== */
            <>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-2xl">✨</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">今日免费额度已用完</h2>
                <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                  解锁 PRO 会员，即可突破限制，享受无缝的创作心流。
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="relative flex flex-col rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md">
                  <div className="mb-4 text-lg font-semibold text-gray-900">加油包</div>
                  <div className="mb-6 flex items-baseline text-3xl font-bold text-gray-900">
                    ¥9.9<span className="ml-1 text-sm font-medium text-gray-500">/ 50次</span>
                  </div>
                  <ul className="mb-6 space-y-2 text-xs text-gray-500 flex-1">
                    <li>✓ 永不过期</li>
                    <li>✓ 支持所有高级大模型</li>
                  </ul>
                  <button 
                    onClick={() => setSelectedPlan({ name: "50次算力加油包", price: "9.9" })}
                    className="w-full rounded-full bg-blue-50 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    立即购买
                  </button>
                </div>

                <div className="relative flex flex-col rounded-[24px] border-2 border-blue-600 bg-blue-600 p-6 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white text-nowrap">超值推荐</div>
                  <div className="mb-4 text-lg font-semibold text-white">PRO 连续包月</div>
                  <div className="mb-6 flex items-baseline text-3xl font-bold text-white">
                    ¥39<span className="ml-1 text-sm font-medium text-blue-200">/ 月</span>
                  </div>
                  <ul className="mb-6 space-y-2 text-xs text-blue-100 flex-1">
                    <li>✓ 每日 100 次高级模型调用</li>
                    <li>✓ 专属极速解析通道</li>
                  </ul>
                  <button 
                    onClick={() => setSelectedPlan({ name: "PRO 连续包月会员", price: "39" })}
                    className="w-full rounded-full bg-white py-2.5 text-sm font-bold text-blue-600 transition-colors hover:bg-gray-50"
                  >
                    立即开通
                  </button>
                </div>
              </div>
              <div className="mt-6 text-center text-xs text-gray-400">
                * 站长手动发货，感谢支持独立开发者
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}