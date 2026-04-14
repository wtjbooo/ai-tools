"use client";

import { useEffect, useState } from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");
  
  // 💡 新增：保存当前正在支付的订单号，用于轮询查询
  const [currentOutTradeNo, setCurrentOutTradeNo] = useState("");

  // 每次关闭弹窗时，重置状态
  useEffect(() => {
    if (!isOpen) {
      setQrCodeUrl("");
      setIsLoading(false);
      setError("");
      setCurrentOutTradeNo(""); // 重置订单号
    }
  }, [isOpen]);

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // 💸 核心创单逻辑
  async function handleCreateOrder(planType: string) {
    try {
      setIsLoading(true);
      setError("");

      const res = await fetch("/api/pay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType, paymentMethod: "wechat" })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "创建订单失败");
      }

      // 成功拿到二维码和金额，更新到视图
      setQrCodeUrl(data.qrCodeUrl);
      setAmount(data.displayAmount);
      
      // 💡 记录下这笔订单号，留给轮询用！
      setCurrentOutTradeNo(data.outTradeNo);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // ==========================================
  // 🚀 核心新增：定时轮询查状态！
  // ==========================================
  useEffect(() => {
    // 只有当二维码显示出来，且有订单号时，才开始轮询
    if (!qrCodeUrl || !currentOutTradeNo) return;

    const checkInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/pay/check-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outTradeNo: currentOutTradeNo })
        });
        
        const data = await res.json();
        
        if (data.status === "paid") {
           // 💰 发现已经付款！
           clearInterval(checkInterval); // 停止轮询
           alert("支付成功！系统已为您发放专属算力！");
           onClose(); // 自动关闭付费弹窗
           window.location.reload(); // 刷新页面，让新的额度在页面上显示出来
        }
      } catch (e) {
        console.error("轮询状态失败", e);
      }
    }, 3000); // 每 3 秒钟悄悄查一次

    // 组件卸载或关闭时，清理定时器，防止内存泄漏
    return () => clearInterval(checkInterval);
  }, [qrCodeUrl, currentOutTradeNo, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-0">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-[32px] bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50" />
        
        <div className="relative p-6 sm:p-10">
          <button onClick={onClose} className="absolute top-6 right-6 rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 z-10">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* ==================================== */}
          {/* 视图 A：显示二维码 (如果 qrCodeUrl 存在) */}
          {/* ==================================== */}
          {qrCodeUrl ? (
            <div className="flex flex-col items-center justify-center py-4 animate-in slide-in-from-right-8 duration-300">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">请扫码支付</h2>
              <div className="mt-2 text-sm text-gray-500">微信 / 支付宝 均可扫码</div>
              
              <div className="mt-8 relative flex items-center justify-center rounded-2xl bg-white p-4 shadow-[0_0_40px_rgba(0,0,0,0.08)] border border-gray-100">
                <img src={qrCodeUrl} alt="支付二维码" className="w-[200px] h-[200px] object-contain" />
              </div>

              <div className="mt-6 flex items-baseline text-4xl font-bold text-gray-900">
                <span className="text-2xl mr-1">¥</span>{amount.toFixed(2)}
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                等待系统支付确认...
              </div>

              <button onClick={() => setQrCodeUrl("")} className="mt-8 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-4">
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
                  您已体验了最顶级的 AI 视觉引擎与大模型能力。<br/>解锁 PRO 会员，即可突破限制，享受无缝的创作心流。
                </p>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center border border-red-100">
                  {error}
                </div>
              )}

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {/* 方案 1：加油包 */}
                <div className="relative flex flex-col rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">加油包</h3>
                    <p className="text-xs text-gray-500 mt-1">适合偶尔使用的轻度创作者</p>
                  </div>
                  <div className="mb-6 flex items-baseline text-3xl font-bold text-gray-900">
                    ¥9.9<span className="ml-1 text-sm font-medium text-gray-500">/ 50次</span>
                  </div>
                  <ul className="mb-6 space-y-3 text-sm text-gray-600 flex-1">
                    <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> 永不过期</li>
                    <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> 支持所有高级大模型</li>
                  </ul>
                  <button 
                    onClick={() => handleCreateOrder("quota_50")}
                    disabled={isLoading}
                    className="w-full rounded-full bg-blue-50 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50"
                  >
                    {isLoading ? "生成订单中..." : "购买加油包"}
                  </button>
                </div>

                {/* 方案 2：包月会员 */}
                <div className="relative flex flex-col rounded-[24px] border-2 border-blue-600 bg-blue-600 p-6 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white">超值推荐</div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">PRO 连续包月</h3>
                    <p className="text-xs text-blue-100 mt-1">生产力工具的终极形态</p>
                  </div>
                  <div className="mb-6 flex items-baseline text-3xl font-bold text-white">
                    ¥39<span className="ml-1 text-sm font-medium text-blue-200">/ 月</span>
                  </div>
                  <ul className="mb-6 space-y-3 text-sm text-blue-50 flex-1">
                    <li className="flex items-center gap-2"><span className="text-white">✓</span> 每日 100 次高级模型调用</li>
                    <li className="flex items-center gap-2"><span className="text-white">✓</span> 专属极速解析通道</li>
                    <li className="flex items-center gap-2"><span className="text-white">✓</span> 优先体验新功能</li>
                  </ul>
                  <button 
                    onClick={() => handleCreateOrder("monthly_pro")}
                    disabled={isLoading}
                    className="w-full rounded-full bg-white py-2.5 text-sm font-bold text-blue-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isLoading ? "生成订单中..." : "开通包月会员"}
                  </button>
                </div>
              </div>
              <div className="mt-6 text-center text-xs text-gray-400">* 支付系统安全保障中</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}