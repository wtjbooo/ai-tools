"use client";

import { useState } from "react";

export default function EnhancePromptPage() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ promptZh?: string; promptEn?: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleEnhance = async () => {
    if (!input.trim()) {
      setError("请输入您脑海中的初步画面~");
      return;
    }

    setError("");
    setIsLoading(true);
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      if (!res.ok) {
        throw new Error("生成失败，请稍后重试");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "请求出错了");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* 头部标题区 */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            提示词魔法棒 ✨
          </h1>
          <p className="mt-4 text-sm text-zinc-500 sm:text-base">
            输入只言片语，AI 瞬间为你扩写为大师级绘图 Prompt，完美适配 Midjourney / Stable Diffusion。
          </p>
        </div>

        {/* 核心输入区 */}
        <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-black/5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：一个赛博朋克风格的女孩..."
            className="w-full resize-none border-0 bg-transparent p-4 text-zinc-900 placeholder:text-zinc-400 focus:ring-0 sm:text-sm sm:leading-6"
            rows={4}
          />
          <div className="flex items-center justify-between border-t border-black/5 px-4 py-3">
            <span className="text-xs text-zinc-400">
              {input.length} / 200
            </span>
            <button
              onClick={handleEnhance}
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  施展魔法中...
                </>
              ) : (
                "一键扩写"
              )}
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <p className="mt-4 text-center text-sm text-red-500 animate-in fade-in slide-in-from-bottom-2">
            {error}
          </p>
        )}

        {/* 结果展示区 */}
        {result && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* 中文对照卡片 */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                中文解析 (仅供参考)
              </h3>
              <p className="text-sm leading-relaxed text-zinc-700">
                {result.promptZh}
              </p>
            </div>

            {/* 英文核心卡片 */}
            <div className="group relative rounded-xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-900">
                  🪄 终极英文 Prompt (点击复制使用)
                </h3>
                <button
                  onClick={() => handleCopy(result.promptEn || "")}
                  className="flex items-center space-x-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 shadow-sm ring-1 ring-inset ring-zinc-200 transition-all hover:bg-zinc-50 active:scale-95"
                >
                  {copied ? (
                    <span className="text-green-600">已复制!</span>
                  ) : (
                    <span>一键复制</span>
                  )}
                </button>
              </div>
              <p className="font-mono text-sm leading-relaxed text-zinc-800">
                {result.promptEn}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}