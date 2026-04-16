// app/auth/email/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";

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
    <div className="min-h-[85vh] flex items-center justify-center relative px-4 overflow-hidden">
      {/* ✨ 低调奢华的 AI 极光背景 (仅在卡片背后隐约发光) ✨ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-cyan-400/10 rounded-full blur-[80px] pointer-events-none animate-pulse duration-[5000ms]" />

      <div className="relative w-full max-w-[380px] bg-white/70 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_16px_64px_-12px_rgba(15,23,42,0.1)] border border-white/80 ring-1 ring-black/[0.03]">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-zinc-900/20">
            {step === 1 ? (
              <Mail className="w-5 h-5 text-white/90" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900 flex items-center justify-center gap-2">
            {step === 1 ? "欢迎回来" : "安全验证"}
            {step === 1 && <Sparkles className="w-5 h-5 text-indigo-400" />}
          </h1>
          <p className="mt-2 text-[13px] text-zinc-500 font-medium">
            {step === 1
              ? "使用邮箱快速登录，探索 AI 灵感"
              : `验证码已发送至 ${email}`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3.5 bg-white/50 border border-zinc-200/80 rounded-2xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm shadow-sm"
                required
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center font-medium bg-red-50 py-1.5 rounded-lg">{error}</p>}
            
            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-zinc-900 text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 focus:outline-none disabled:opacity-50 transition-all active:scale-[0.98] shadow-md shadow-zinc-900/10"
            >
              {isLoading ? "发送中..." : "继续"}
              {!isLoading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-[12px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                已收到验证码？直接输入
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full px-4 py-3.5 bg-white/50 border border-zinc-200/80 rounded-2xl text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-center tracking-[0.5em] text-xl font-bold shadow-sm"
                required
                autoFocus
                maxLength={6}
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center font-medium bg-red-50 py-1.5 rounded-lg">{error}</p>}
            
            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="group w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-zinc-900 text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 focus:outline-none disabled:opacity-50 transition-all active:scale-[0.98] shadow-md shadow-zinc-900/10"
            >
              {isLoading ? "验证中..." : "完成登录"}
            </button>
            
            <div className="flex items-center justify-between mt-5 px-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[12px] font-medium text-zinc-400 hover:text-zinc-800 transition-colors"
              >
                更换邮箱
              </button>
              <button
                type="button"
                onClick={() => handleSendCode()}
                disabled={countdown > 0 || isLoading}
                className="text-[12px] font-medium text-zinc-400 hover:text-zinc-800 disabled:opacity-50 transition-colors"
              >
                {countdown > 0 ? `${countdown} 秒后可重发` : "重新发送验证码"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center border-t border-zinc-100 pt-6">
          <Link href="/" className="text-[12px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors">
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