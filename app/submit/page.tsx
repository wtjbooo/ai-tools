"use client";

import { useState } from "react";
import Link from "next/link";

export default function SubmitPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) setMsg(data.error ?? "提交失败");
    else setMsg("提交成功 ✅ 已进入审核队列");
    e.currentTarget.reset();
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">提交收录</h1>
        <p className="text-gray-600">提交后会进入审核，通过后会出现在目录中。</p>
        <Link className="underline" href="/">← 返回首页</Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border p-4">
        <input name="name" placeholder="工具名称（必填）" className="w-full rounded border px-3 py-2" required />
        <input name="website" placeholder="官网链接（必填）https://..." className="w-full rounded border px-3 py-2" required />
        <input name="category" placeholder="分类（必填，例如：聊天助手）" className="w-full rounded border px-3 py-2" required />
        <input name="tags" placeholder="标签（选填，用逗号分隔，例如：chat, writing）" className="w-full rounded border px-3 py-2" />
        <textarea name="description" placeholder="一句话介绍（必填）" className="w-full rounded border px-3 py-2" rows={4} required />
        <input name="contact" placeholder="联系方式（选填：邮箱/微信）" className="w-full rounded border px-3 py-2" />

        <button disabled={loading} className="rounded-xl border px-4 py-2 hover:shadow-sm">
          {loading ? "提交中..." : "提交"}
        </button>

        {msg ? <p className="text-sm text-gray-700">{msg}</p> : null}
      </form>
    </div>
  );
}