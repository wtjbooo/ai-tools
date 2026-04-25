// app/auth/email/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Sparkles, ShieldCheck, ArrowRight, KeyRound } from "lucide-react";

function EmailAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  // 登录模式状态
  const [mode, setMode] = useState<"password" | "code">("password");
  
  // 表单数据
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  
  // 交互状态
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // 处理倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // 发送验证码
  const handleSendCode = async () => {
    setError("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }

    setCountdown(60);
    try {
      // 保持使用你原来的发送验证码接口
      const res = await fetch("/api/auth/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "login" }),
      });

      if (!res.ok) {
        let errorMsg = "发送失败，请稍后重试";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch (parseErr) {}
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      setError(err.message === "Failed to fetch" ? "网络连接不稳定，请重试。" : err.message);
      setCountdown(0);
    }
  };

  // 提交登录/注册表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) return setError("请输入邮箱");
    if (mode === "password" && !password) return setError("请输入密码");
    if (mode === "code" && !code) return setError("请输入验证码");

    setIsLoading(true);
    try {
      // 对接我们在第三步重写的新 API！
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          password: password || undefined, 
          code: mode === "code" ? code : undefined 
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "验证失败");

      // 登录成功，强制跳转并刷新状态
      window.location.href = redirectTo;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center relative px-4 overflow-hidden">
      {/* ✨ 低调奢华的 AI 极光背景 ✨ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-cyan-400/10 rounded-full blur-[80px] pointer-events-none animate-pulse duration-[5000ms]" />

      <div className="relative w-full max-w-[400px] bg-white/70 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_16px_64px_-12px_rgba(15,23,42,0.1)] border border-white/80 ring-1 ring-black/[0.03]">
        
        {/* 顶部图标与标题 */}
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-zinc-900/20">
            {mode === "password" ? (
              <KeyRound className="w-5 h-5 text-indigo-400" />
            ) : (
              <Mail className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900 flex items-center justify-center gap-2">
            欢迎来到 XAira
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </h1>
        </div>

        {/* 模式切换 Tabs */}
        <div className="flex bg-zinc-100/80 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setMode("password"); setError(""); }}
            className={`flex-1 rounded-lg py-2 text-[13px] font-medium transition-all duration-200 ${
              mode === "password" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            密码登录
          </button>
          <button
            type="button"
            onClick={() => { setMode("code"); setError(""); }}
            className={`flex-1 rounded-lg py-2 text-[13px] font-medium transition-all duration-200 ${
              mode === "code" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            验证码登录/注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 邮箱输入框 */}
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱地址"
              className="w-full px-4 py-3.5 bg-white/50 border border-zinc-200/80 rounded-2xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm shadow-sm"
              required
            />
          </div>

          {/* 验证码输入框 (仅验证码模式显示) */}
          {mode === "code" && (
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6位验证码"
                maxLength={6}
                className="w-full px-4 py-3.5 bg-white/50 border border-zinc-200/80 rounded-2xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm shadow-sm tracking-widest"
                required={mode === "code"}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0}
                className="shrink-0 px-4 py-3.5 bg-zinc-100 text-zinc-700 rounded-2xl text-[13px] font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
              </button>
            </div>
          )}

          {/* 密码输入框 */}
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "code" ? "设置登录密码 (可选)" : "请输入密码"}
              className="w-full px-4 py-3.5 bg-white/50 border border-zinc-200/80 rounded-2xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm shadow-sm"
              required={mode === "password"} // 仅在密码模式下必填
            />
          </div>

          {error && <p className="text-xs text-red-500 text-center font-medium bg-red-50 py-1.5 rounded-lg">{error}</p>}
          
          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isLoading}
            className="group mt-2 w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-zinc-900 text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 focus:outline-none disabled:opacity-50 transition-all active:scale-[0.98] shadow-md shadow-zinc-900/10"
          >
            {isLoading ? "处理中..." : mode === "password" ? "立即登录" : "登录 / 注册"}
            {!isLoading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
          </button>
        </form>

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