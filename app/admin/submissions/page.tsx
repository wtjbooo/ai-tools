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
  reason: string;
  status: string;
  createdAt: string;
};

type EditForm = {
  id: string;
  name: string;
  website: string;
  description: string;
  category: string;
  tags: string;
  contact: string;
  reason: string;
};

export default function AdminSubmissionsPage() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [list, setList] = useState<Submission[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(clearMsg = false) {
    setLoading(true);

    if (clearMsg) {
      setMsg(null);
    }

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
    load(true);
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
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(data.error ?? "拒绝失败");

    setMsg("已拒绝");
    await load();
  }

  function startEdit(x: Submission) {
    setEditingId(x.id);
    setEditForm({
      id: x.id,
      name: x.name,
      website: x.website,
      description: x.description,
      category: x.category,
      tags: x.tags,
      contact: x.contact,
      reason: x.reason,
    });
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit() {
    if (!editForm) return;

    setSaving(true);
    setMsg(null);

    const res = await fetch("/api/admin/update-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });

    const data = await res.json().catch(() => ({}));

    setSaving(false);

    if (!res.ok) {
      setMsg(data.error ?? "保存失败");
      return;
    }

    setMsg("保存成功");
    setEditingId(null);
    setEditForm(null);
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

        <button
          onClick={() => load(true)}
          className="rounded-full border px-3 py-1 text-sm"
        >
          {loading ? "刷新中..." : "刷新"}
        </button>
      </div>

      {msg ? <div className="rounded border p-3 text-sm">{msg}</div> : null}

      {list.length === 0 ? (
        <div className="text-gray-600">{loading ? "加载中..." : "暂无数据"}</div>
      ) : (
        <div className="space-y-3">
          {list.map((x) => {
            const isEditing = editingId === x.id && editForm;

            return (
              <div key={x.id} className="rounded-xl border p-4 space-y-3">
                {isEditing ? (
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium">工具名称</label>
                        <input
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium">官网链接</label>
                        <input
                          value={editForm.website}
                          onChange={(e) =>
                            setEditForm({ ...editForm, website: e.target.value })
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium">一句话简介</label>
                        <textarea
                          rows={3}
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({ ...editForm, description: e.target.value })
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium">分类</label>
                        <input
                          value={editForm.category}
                          onChange={(e) =>
                            setEditForm({ ...editForm, category: e.target.value })
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium">标签</label>
                        <input
                          value={editForm.tags}
                          onChange={(e) =>
                            setEditForm({ ...editForm, tags: e.target.value })
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium">联系方式</label>
                        <input
                          value={editForm.contact}
                          onChange={(e) =>
                            setEditForm({ ...editForm, contact: e.target.value })
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium">补充说明</label>
                        <textarea
                          rows={8}
                          value={editForm.reason}
                          onChange={(e) =>
                            setEditForm({ ...editForm, reason: e.target.value })
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="rounded border px-3 py-1 text-sm"
                        >
                          {saving ? "保存中..." : "保存"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="rounded border px-3 py-1 text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-lg">{x.name}</div>

                    <div className="text-sm text-gray-600">
                      分类：{x.category} · tags：{x.tags || "-"} · 联系：{x.contact || "-"}
                    </div>

                    <div className="text-sm">{x.description}</div>

                    {x.reason ? (
                      <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                        <div className="mb-1 font-medium text-gray-900">补充说明</div>
                        <div>{x.reason}</div>
                      </div>
                    ) : null}

                    <a
                      className="underline text-sm"
                      href={x.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {x.website}
                    </a>

                    <div className="text-xs text-gray-500">
                      提交时间：{new Date(x.createdAt).toLocaleString("zh-CN")}
                    </div>

                    <div className="flex gap-2 pt-2">
                      {status === "pending" ? (
                        <>
                          <button
                            onClick={() => startEdit(x)}
                            className="rounded border px-3 py-1 text-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => approve(x.id)}
                            className="rounded border px-3 py-1 text-sm"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => reject(x.id)}
                            className="rounded border px-3 py-1 text-sm"
                          >
                            拒绝
                          </button>
                        </>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}