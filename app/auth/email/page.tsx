// app/auth/email/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function EmailAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // 处理倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // 如果有响应但不是 200，尝试解析错误信息
      if (!res.ok) {
        let errorMsg = "发送失败，请稍后重试";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch (parseErr) {}
        throw new Error(errorMsg);
      }

      // 发送成功，跳转第二步
      setStep(2);
      setCountdown(60);
    } catch (err: any) {
      // 捕获网络中断或 Failed to fetch
      if (err.message === "Failed to fetch") {
        setError("网络连接不稳定，请检查是否已收到邮件。");
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code || code.length < 6) {
      setError("请输入 6 位验证码");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/email/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "验证失败");

      // 登录成功，强制刷新全站状态
      window.location.href = redirectTo;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-[360px] bg-white rounded-[28px] p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-zinc-100">
        <div className="text-center mb-8">
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">
            {step === 1 ? "邮箱登录" : "输入验证码"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {step === 1
              ? "使用您的邮箱接收验证码完成登录"
              : `验证码已发送至 ${email}`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition-colors text-sm"
                required
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-zinc-900 text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 focus:outline-none disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isLoading ? "发送中..." : "继续"}
            </button>

            {/* 核心体验优化：允许用户手动进入下一步 */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                已收到验证码？直接输入
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition-colors text-center tracking-[0.5em] text-xl font-bold"
                required
                autoFocus
                maxLength={6}
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}
            
            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full py-3.5 px-4 bg-zinc-900 text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 focus:outline-none disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isLoading ? "验证中..." : "完成登录"}
            </button>
            
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                更换邮箱
              </button>
              <button
                type="button"
                onClick={() => handleSendCode()}
                disabled={countdown > 0 || isLoading}
                className="text-xs text-zinc-400 hover:text-zinc-900 disabled:opacity-50 transition-colors"
              >
                {countdown > 0 ? `${countdown} 秒后可重发` : "重新发送验证码"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-[13px] text-zinc-400 hover:text-zinc-600 transition-colors">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function EmailAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" /></div>}>
      <EmailAuthContent />
    </Suspense>
  );
}