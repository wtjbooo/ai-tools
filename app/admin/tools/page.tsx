"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ToolItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  content: string;
  website: string | null;
  logoUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  category: {
    name: string;
  };
  tags: {
    tag: {
      id: string;
      name: string;
    };
  }[];
};

type EditToolForm = {
  id: string;
  name: string;
  website: string;
  logoUrl: string;
  description: string;
  content: string;
  category: string;
  tags: string;
};

export default function AdminToolsPage() {
  const router = useRouter();

  const [list, setList] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditToolForm | null>(null);
  const [saving, setSaving] = useState(false);

  const [backfilling, setBackfilling] = useState(false);
  const [backfillLogs, setBackfillLogs] = useState<string[]>([]);

  function handleUnauthorized(data?: { error?: string }) {
    setMsg(data?.error ?? "登录已失效，请重新登录");
    router.replace("/admin");
  }

  async function logout() {
    setMsg(null);

    const res = await fetch("/api/admin/logout", {
      method: "POST",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(data.error ?? "退出失败");
      return;
    }

    router.replace("/admin");
  }

  async function load(clearMsg = false) {
    setLoading(true);

    if (clearMsg) {
      setMsg(null);
    }

    const res = await fetch("/api/admin/tools");
    const data = await res.json().catch(() => ({}));

    setLoading(false);

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized(data);
      return;
    }

    if (!res.ok) {
      setMsg(data.error ?? "加载失败");
      setList([]);
      return;
    }

    setList(data.list ?? []);
  }

  useEffect(() => {
    load(true);
  }, []);

  async function toggleTool(id: string, isPublished: boolean) {
    setMsg(null);

    const res = await fetch("/api/admin/toggle-tool", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, isPublished }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized(data);
      return;
    }

    if (!res.ok) {
      setMsg(data.error ?? "操作失败");
      return;
    }

    setMsg(isPublished ? "已恢复显示" : "已隐藏工具");
    await load();
  }

  function startEdit(tool: ToolItem) {
    setEditingId(tool.id);
    setEditForm({
      id: tool.id,
      name: tool.name,
      website: tool.website ?? "",
      logoUrl: tool.logoUrl ?? "",
      description: tool.description,
      content: tool.content ?? "",
      category: tool.category?.name ?? "",
      tags: tool.tags.map((item) => item.tag.name).join(", "),
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

    const res = await fetch("/api/admin/update-tool", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editForm),
    });

    const data = await res.json().catch(() => ({}));

    setSaving(false);

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized(data);
      return;
    }

    if (!res.ok) {
      setMsg(data.error ?? "保存失败");
      return;
    }

    setMsg("工具保存成功");
    setEditingId(null);
    setEditForm(null);
    await load();
  }

  async function backfillLogos(limit: number, force = false) {
    setBackfilling(true);
    setMsg(null);
    setBackfillLogs([]);

    const res = await fetch("/api/admin/backfill-logos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit, force }),
    });

    const data = await res.json().catch(() => ({}));

    setBackfilling(false);

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized(data);
      return;
    }

    if (!res.ok) {
      setMsg(data.error ?? "批量补 logo 失败");
      return;
    }

    setMsg(
      `批量补 logo 完成：处理 ${data.processed} 条，成功 ${data.success}，跳过 ${data.skipped}，失败 ${data.failed}${data.force ? "（强制重补模式）" : ""}`
    );
    setBackfillLogs(data.logs ?? []);
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">工具管理</h1>

        <div className="flex items-center gap-3">
          <Link className="underline" href="/admin/submissions">
            审核队列
          </Link>
          <Link className="underline" href="/">
            返回首页
          </Link>
          <button
            onClick={logout}
            className="rounded border px-3 py-1 text-sm"
          >
            退出登录
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => load(true)}
          className="rounded border px-3 py-1 text-sm"
        >
          {loading ? "刷新中..." : "刷新"}
        </button>

        <button
          onClick={() => backfillLogos(5)}
          disabled={backfilling}
          className="rounded border px-3 py-1 text-sm"
        >
          {backfilling ? "处理中..." : "批量补 logo（5 条）"}
        </button>

        <button
          onClick={() => backfillLogos(20)}
          disabled={backfilling}
          className="rounded border px-3 py-1 text-sm"
        >
          {backfilling ? "处理中..." : "批量补 logo（20 条）"}
        </button>

        <button
          onClick={() => backfillLogos(5, true)}
          disabled={backfilling}
          className="rounded border px-3 py-1 text-sm"
        >
          {backfilling ? "处理中..." : "强制重补坏 logo（5 条）"}
        </button>
      </div>

      {msg ? <div className="rounded border p-3 text-sm">{msg}</div> : null}

      {backfillLogs.length > 0 ? (
        <div className="rounded border p-3 text-sm space-y-1 bg-gray-50">
          <div className="font-medium">本次批量补 logo 日志</div>
          {backfillLogs.map((log, index) => (
            <div key={`${log}-${index}`}>{log}</div>
          ))}
        </div>
      ) : null}

      {list.length === 0 ? (
        <div className="text-gray-600">{loading ? "加载中..." : "暂无工具"}</div>
      ) : (
        <div className="space-y-3">
          {list.map((tool) => {
            const isEditing = editingId === tool.id && editForm;

            return (
              <div key={tool.id} className="rounded-xl border p-4 space-y-3">
                {isEditing ? (
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
                      <label className="mb-1 block text-sm font-medium">logoUrl</label>
                      <input
                        value={editForm.logoUrl}
                        onChange={(e) =>
                          setEditForm({ ...editForm, logoUrl: e.target.value })
                        }
                        placeholder="https://... 或留空"
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        自动抓得不好时，可以手动填图片地址；留空则前台会走默认图标。
                      </p>
                    </div>

                    {editForm.logoUrl ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">logo 预览</div>
                        <img
                          src={editForm.logoUrl}
                          alt="logo preview"
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded border object-cover bg-white"
                        />
                      </div>
                    ) : null}

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
                      <label className="mb-1 block text-sm font-medium">详细介绍</label>
                      <textarea
                        rows={8}
                        value={editForm.content}
                        onChange={(e) =>
                          setEditForm({ ...editForm, content: e.target.value })
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
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold">{tool.name}</div>
                        <div className="text-sm text-gray-600">
                          slug：{tool.slug} · 分类：{tool.category?.name || "未分类"}
                        </div>
                      </div>

                      <div
                        className={`rounded-full px-3 py-1 text-xs border ${
                          tool.isPublished ? "bg-gray-100" : "bg-white"
                        }`}
                      >
                        {tool.isPublished ? "已发布" : "已隐藏"}
                      </div>
                    </div>

                    <div className="text-sm text-gray-700">{tool.description}</div>

                    <div className="flex flex-wrap gap-2">
                      {tool.tags.map((item) => (
                        <span
                          key={item.tag.id}
                          className="rounded-full border px-2 py-1 text-xs"
                        >
                          {item.tag.name}
                        </span>
                      ))}
                    </div>

                    {tool.logoUrl ? (
                      <div className="text-xs text-gray-500 break-all">
                        logoUrl：{tool.logoUrl}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">logoUrl：未设置</div>
                    )}

                    {tool.website ? (
                      <a
                        className="underline text-sm"
                        href={tool.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {tool.website}
                      </a>
                    ) : null}

                    <div className="text-xs text-gray-500">
                      创建时间：{new Date(tool.createdAt).toLocaleString("zh-CN")}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => startEdit(tool)}
                        className="rounded border px-3 py-1 text-sm"
                      >
                        编辑
                      </button>

                      {tool.isPublished ? (
                        <button
                          onClick={() => toggleTool(tool.id, false)}
                          className="rounded border px-3 py-1 text-sm"
                        >
                          隐藏
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleTool(tool.id, true)}
                          className="rounded border px-3 py-1 text-sm"
                        >
                          恢复
                        </button>
                      )}

                      <Link
                        href={`/tool/${tool.slug}`}
                        className="rounded border px-3 py-1 text-sm"
                      >
                        查看详情
                      </Link>
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