"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

export function LoginModal() {
  const { isLoginModalOpen, closeLoginModal } = useAuth();
  const router = useRouter();

  // 表单状态
  const [mode, setMode] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  
  // 交互状态
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isLoginModalOpen) return null;

  // 处理发送验证码
  const handleSendCode = async () => {
    if (!email) {
      setErrorMsg("请先输入邮箱地址");
      return;
    }
    setErrorMsg("");
    setCountdown(60);
    
    // 启动倒计时
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      // 调用你的发送验证码接口 (这里假设你的接口接收 email 参数)
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "login" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "验证码发送失败");
        setCountdown(0);
        clearInterval(timer);
      }
    } catch (err) {
      setErrorMsg("网络请求失败，请检查连接");
      setCountdown(0);
      clearInterval(timer);
    }
  };

  // 处理登录/注册提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email) {
      return setErrorMsg("请输入邮箱");
    }
    if (mode === "password" && !password) {
      return setErrorMsg("请输入密码");
    }
    if (mode === "code" && !code) {
      return setErrorMsg("请输入验证码");
    }

    setLoading(true);

    try {
      // 提交到我们在第三步重写的新 API
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

      if (res.ok && data.ok) {
        // 登录成功！
        closeLoginModal();
        router.refresh(); // 刷新页面状态
      } else {
        // 登录失败，显示后端返回的错误信息
        setErrorMsg(data.error || "登录失败，请重试");
      }
    } catch (err) {
      setErrorMsg("发生意外错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px] transition-opacity"
        onClick={closeLoginModal}
      />
      
      {/* 弹窗本体 */}
      <div className="relative w-full max-w-[380px] overflow-hidden rounded-[28px] bg-white p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] transition-all">
        {/* 关闭按钮 */}
        <button
          onClick={closeLoginModal}
          className="absolute right-6 top-6 text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 标题区 */}
        <div className="mt-2 mb-6">
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900 text-center">
            欢迎来到 XAira
          </h2>
        </div>

        {/* 模式切换 Tabs */}
        <div className="flex rounded-lg bg-zinc-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode("password"); setErrorMsg(""); }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
              mode === "password" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            密码登录
          </button>
          <button
            type="button"
            onClick={() => { setMode("code"); setErrorMsg(""); }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
              mode === "code" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            验证码登录/注册
          </button>
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 邮箱输入 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入你的邮箱地址"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              required
            />
          </div>

          {/* 验证码输入 (仅在验证码模式显示) */}
          {mode === "code" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6位验证码"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className="shrink-0 rounded-xl bg-zinc-100 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
                </button>
              </div>
            </div>
          )}

          {/* 密码输入 (密码模式为必填，验证码模式为可选设置) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              {mode === "code" ? "设置密码 (可选)" : "密码"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "code" ? "为下次登录设置一个密码" : "请输入密码"}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-70"
          >
            {loading ? "处理中..." : mode === "password" ? "立即登录" : "登录 / 注册"}
          </button>
        </form>

        {/* 底部协议提示 */}
        <div className="mt-6 text-center">
          <p className="text-[12px] text-zinc-400">
            登录即代表你同意我们的{" "}
            <a href="#" className="text-zinc-500 hover:text-zinc-900 transition-colors">服务条款</a>
            {" "}与{" "}
            <a href="#" className="text-zinc-500 hover:text-zinc-900 transition-colors">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
}