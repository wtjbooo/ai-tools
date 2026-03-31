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

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发送失败");

      setStep(2);
      setCountdown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code || code.length < 4) {
      setError("请输入完整的验证码");
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

      // 登录成功，跳转回原页面或首页
      router.push(redirectTo);
      router.refresh(); // 强制刷新以更新服务端的 session 状态
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
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-zinc-900 text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 transition-all"
            >
              {isLoading ? "发送中..." : "继续"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="请输入 6 位验证码"
                className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition-colors text-center tracking-widest text-lg font-medium"
                required
                autoFocus
                maxLength={6}
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full py-3.5 px-4 bg-zinc-900 text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 transition-all"
            >
              {isLoading ? "验证中..." : "完成登录"}
            </button>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0 || isLoading}
                className="text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-50 disabled:hover:text-zinc-500 transition-colors"
              >
                {countdown > 0 ? `${countdown} 秒后可重新发送` : "重新发送验证码"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-[13px] text-zinc-400 hover:text-zinc-900 transition-colors">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function EmailAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" /></div>}>
      <EmailAuthContent />
    </Suspense>
  );
}