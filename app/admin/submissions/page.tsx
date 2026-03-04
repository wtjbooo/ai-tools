"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Submission = {
  id: string;
  name: string;
  website: string;
  description: string;
  category: string;
  tags: string;
  contact: string;
  status: string;
  createdAt: string;
};

export default function AdminSubmissionsPage() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [list, setList] = useState<Submission[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`/api/admin/submissions?status=${status}`);
    const data = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok) {
      setMsg(data.error ?? "加载失败（可能没登录）");
      setList([]);
      return;
    }

    setList(data.list ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function approve(id: string) {
    setMsg(null);
    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(data.error ?? "通过失败");

    setMsg(`已通过 ✅ 新工具 slug：${data.toolSlug}`);
    await load();
  }

  async function reject(id: string) {
    setMsg(null);
    const res = await fetch("/api/admin/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(data.error ?? "拒绝失败");

    setMsg("已拒绝");
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">审核队列</h1>
        <Link className="underline" href="/">
          ← 返回首页
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-sm ${
              status === s ? "bg-gray-100" : "bg-white"
            }`}
          >
            {s}
          </button>
        ))}

        <button onClick={load} className="rounded-full border px-3 py-1 text-sm">
          {loading ? "刷新中..." : "刷新"}
        </button>
      </div>

      {msg ? <div className="rounded border p-3 text-sm">{msg}</div> : null}

      {list.length === 0 ? (
        <div className="text-gray-600">{loading ? "加载中..." : "暂无数据"}</div>
      ) : (
        <div className="space-y-3">
          {list.map((x) => (
            <div key={x.id} className="rounded-xl border p-4 space-y-2">
              <div className="font-semibold text-lg">{x.name}</div>

              <div className="text-sm text-gray-600">
                分类：{x.category} · tags：{x.tags || "-"} · 联系：{x.contact || "-"}
              </div>

              <div className="text-sm">{x.description}</div>

              <a className="underline text-sm" href={x.website} target="_blank" rel="noreferrer">
                {x.website}
              </a>

              {status === "pending" ? (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => approve(x.id)} className="rounded border px-3 py-1 text-sm">
                    通过
                  </button>
                  <button onClick={() => reject(x.id)} className="rounded border px-3 py-1 text-sm">
                    拒绝
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}