"use client";

import { useState } from "react";
import Link from "next/link";

export default function SubmitForm() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setMsg(null);
  setLoading(true);

  const form = e.currentTarget;
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(data.error ?? "提交失败，请稍后重试");
    } else {
      setMsg("提交成功，我们会尽快审核并收录。");
      form.reset();
    }
  } catch (error) {
    console.error("submit form error:", error);
    setMsg("网络异常，请稍后重试。");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div className="space-y-3">
        <Link href="/" className="text-sm underline">
          ← 返回首页
        </Link>

        <h1 className="text-3xl font-bold">提交你的 AI 工具</h1>
        <p className="text-gray-600 leading-7">
          欢迎提交优质的 AI 工具。请尽量填写完整信息，方便我们更快审核。
        </p>
      </div>

      <div className="rounded-2xl border p-5 space-y-3 text-sm text-gray-700">
        <h2 className="text-lg font-semibold text-black">收录说明</h2>
        <p>1. 一般会在 1 到 3 天内完成审核。</p>
        <p>2. 仅收录可正常访问、内容清晰、用途明确的 AI 工具或相关产品。</p>
        <p>3. 不收录违法违规、长期失效、内容空白或明显低质量的网站。</p>
        <p>4. 如果信息不完整，可能不会通过审核。</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border p-6">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium">
            工具名称
          </label>
          <input
            id="name"
            name="name"
            placeholder="例如：ChatGPT"
            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="website" className="block text-sm font-medium">
            官网链接
          </label>
          <input
            id="website"
            name="website"
            type="url"
            placeholder="https://example.com"
            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium">
            一句话简介
          </label>
          <input
            id="description"
            name="description"
            placeholder="例如：OpenAI 推出的 AI 对话助手"
            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium">
            分类
          </label>
          <input
            id="category"
            name="category"
            placeholder="例如：聊天助手 / 图像生成 / 视频生成 / AI搜索"
            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="tags" className="block text-sm font-medium">
            标签
          </label>
          <input
            id="tags"
            name="tags"
            placeholder="例如：免费试用, 文生图, 办公效率"
            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="contact" className="block text-sm font-medium">
            联系方式
          </label>
          <input
            id="contact"
            name="contact"
            placeholder="邮箱、微信或其他联系方式"
            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="reason" className="block text-sm font-medium">
            补充说明
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={5}
            placeholder="可以补充工具特点、适合人群、价格模式、核心功能等信息"
            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-black px-5 py-3 text-white disabled:opacity-60"
        >
          {loading ? "提交中..." : "提交收录"}
        </button>

        {msg ? <p className="text-sm text-gray-700">{msg}</p> : null}
      </form>
    </div>
  );
}