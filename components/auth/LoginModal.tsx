"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

export function LoginModal() {
  const { isLoginModalOpen, closeLoginModal } = useAuth();
  const router = useRouter();

  if (!isLoginModalOpen) return null;

  const handleEmailLogin = () => {
    // 1. 关闭弹窗
    closeLoginModal();
    // 2. 跳转到后端的邮箱登录入口 (支持 redirectTo 处理)
    router.push("/api/auth/email/start");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* 背景遮罩：使用偏黑的纯色 + 极轻微的毛玻璃，突出高级感 */}
      <div 
        className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px] transition-opacity"
        onClick={closeLoginModal}
      />
      
      {/* 弹窗本体：摒弃过重的阴影，使用柔和的扩散阴影和精密的圆角 */}
      <div className="relative w-full max-w-[360px] overflow-hidden rounded-[28px] bg-white p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] transition-all">
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
        <div className="text-center mt-2 mb-8">
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">
            登录你的账号
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            选择一种方式继续
          </p>
        </div>

        {/* 登录选项列表 */}
        <div className="space-y-3">
          {/* 1. 邮箱登录 - 激活可用 */}
          <button
            onClick={handleEmailLogin}
            className="group flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-900 hover:bg-zinc-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 transition-colors group-hover:bg-white">
                <svg className="h-5 w-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-zinc-900">邮箱登录</div>
                <div className="text-xs text-zinc-500">安全且便捷的验证方式</div>
              </div>
            </div>
            <svg className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 2. 微信登录 - 敬请期待 (置灰展示) */}
          <button
            disabled
            className="flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-4 opacity-70"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100/80">
                <svg className="h-5 w-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.5,13.5 C7.67,13.5 7,12.83 7,12 C7,11.17 7.67,10.5 8.5,10.5 C9.33,10.5 10,11.17 10,12 C10,12.83 9.33,13.5 8.5,13.5 Z M15.5,13.5 C14.67,13.5 14,12.83 14,12 C14,11.17 14.67,10.5 15.5,10.5 C16.33,10.5 17,11.17 17,12 C17,12.83 16.33,13.5 15.5,13.5 Z M12,3 C6.48,3 2,6.84 2,11.5 C2,14.16 3.42,16.51 5.61,17.93 L4.72,20.57 L7.72,19.09 C9.05,19.67 10.49,20 12,20 C17.52,20 22,16.16 22,11.5 C22,6.84 17.52,3 12,3 Z"/>
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-zinc-400">微信登录</div>
              </div>
            </div>
            <div className="rounded-md bg-zinc-200/50 px-2 py-1 text-[11px] font-medium text-zinc-500">即将开放</div>
          </button>

          {/* 3. QQ登录 - 敬请期待 (置灰展示) */}
          <button
            disabled
            className="flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-4 opacity-70"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100/80">
                <svg className="h-5 w-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  {/* QQ 占位图标 */}
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-zinc-400">QQ 登录</div>
              </div>
            </div>
            <div className="rounded-md bg-zinc-200/50 px-2 py-1 text-[11px] font-medium text-zinc-500">即将开放</div>
          </button>
        </div>

        {/* 底部协议提示 */}
        <div className="mt-8 text-center">
          <p className="text-[12px] text-zinc-400">
            继续即代表你同意我们的{" "}
            <a href="#" className="text-zinc-500 hover:text-zinc-900 transition-colors">服务条款</a>
            {" "}与{" "}
            <a href="#" className="text-zinc-500 hover:text-zinc-900 transition-colors">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
}