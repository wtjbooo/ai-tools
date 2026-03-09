"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

const STATUS_OPTIONS = [
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已拒绝" },
] as const;

type StatusValue = (typeof STATUS_OPTIONS)[number]["value"];
type ActionType = "approve" | "reject" | "save" | null;

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function validateSingleCategoryName(raw: string) {
  const value = normalizeSpaces(raw || "");

  if (!value) {
    return "分类不能为空";
  }

  if (/[\/\\|]+/.test(value) || /,|，|、/.test(value)) {
    return "分类只能填写一个主分类，不能填写“聊天助手 / 视频生成”这种组合值";
  }

  const lower = value.toLowerCase();

  if (
    lower === "category" ||
    lower === "categories" ||
    lower === "uncategorized" ||
    lower === "unknown"
  ) {
    return "分类值无效，请填写真实分类名称";
  }

  if (value.length < 2 || value.length > 50) {
    return "分类长度需在 2 到 50 个字符之间";
  }

  return "";
}

function getButtonClass(disabled = false, active = false) {
  return [
    "rounded border px-3 py-1 text-sm transition duration-150",
    "active:scale-[0.97] active:opacity-80",
    active ? "bg-gray-100" : "bg-white",
    disabled ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50",
  ].join(" ");
}

export default function AdminSubmissionsPage() {
  const router = useRouter();

  const [status, setStatus] = useState<StatusValue>("pending");
  const [list, setList] = useState<Submission[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);

  const isBusy = loading || loggingOut || !!actionId;

  function handleUnauthorized(data?: { error?: string }) {
    setMsg(data?.error ?? "登录已失效，请重新登录");
    router.replace("/admin");
  }

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setMsg(null);

    const res = await fetch("/api/admin/logout", {
      method: "POST",
    });

    const data = await res.json().catch(() => ({}));

    setLoggingOut(false);

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

    const res = await fetch(`/api/admin/submissions?status=${status}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function approve(id: string) {
    if (actionId) return;

    setActionId(id);
    setActionType("approve");
    setMsg(null);

    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const data = await res.json().catch(() => ({}));

    setActionId(null);
    setActionType(null);

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized(data);
      return;
    }

    if (!res.ok) {
      setMsg(data.error ?? "通过失败");
      return;
    }

    setMsg(`已通过 ✅ 新工具 slug：${data.toolSlug}`);
    await load();
  }

  async function reject(id: string) {
    if (actionId) return;

    setActionId(id);
    setActionType("reject");
    setMsg(null);

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const data = await res.json().catch(() => ({}));

    setActionId(null);
    setActionType(null);

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized(data);
      return;
    }

    if (!res.ok) {
      setMsg(data.error ?? "拒绝失败");
      return;
    }

    setMsg("已拒绝");
    await load();
  }

  function startEdit(x: Submission) {
    if (isBusy) return;

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
    if (actionType === "save") return;

    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit() {
    if (!editForm || actionId) return;

    const categoryError = validateSingleCategoryName(editForm.category);
    if (categoryError) {
      setMsg(categoryError);
      return;
    }

    setActionId(editForm.id);
    setActionType("save");
    setMsg(null);

    const res = await fetch("/api/admin/update-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        category: normalizeSpaces(editForm.category),
      }),
    });

    const data = await res.json().catch(() => ({}));

    setActionId(null);
    setActionType(null);

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized(data);
      return;
    }

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
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">审核队列</h1>

        <div className="flex items-center gap-3">
          <Link className="underline" href="/admin/tools">
            工具管理
          </Link>
          <Link className="underline" href="/">
            返回首页
          </Link>
          <button
            onClick={logout}
            disabled={loggingOut}
            className={getButtonClass(loggingOut)}
          >
            {loggingOut ? "退出中..." : "退出登录"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((item) => (
          <button
            key={item.value}
            onClick={() => setStatus(item.value)}
            disabled={loading || !!actionId || loggingOut}
            className={getButtonClass(
              loading || !!actionId || loggingOut,
              status === item.value
            )}
          >
            {item.label}
          </button>
        ))}

        <button
          onClick={() => load(true)}
          disabled={loading || !!actionId || loggingOut}
          className={getButtonClass(loading || !!actionId || loggingOut)}
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
            const isApproving = actionId === x.id && actionType === "approve";
            const isRejecting = actionId === x.id && actionType === "reject";
            const isSaving = actionId === x.id && actionType === "save";
            const rowBusy = actionId === x.id;

            return (
              <div key={x.id} className="space-y-3 rounded-xl border p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">工具名称</label>
                      <input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        disabled={isSaving}
                        className="w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">官网链接</label>
                      <input
                        value={editForm.website}
                        onChange={(e) =>
                          setEditForm({ ...editForm, website: e.target.value })
                        }
                        disabled={isSaving}
                        className="w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
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
                        disabled={isSaving}
                        className="w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">分类</label>
                      <input
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm({ ...editForm, category: e.target.value })
                        }
                        disabled={isSaving}
                        className="w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        只填写一个主分类，不要填写“聊天助手 / 视频生成”这种组合值
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">标签</label>
                      <input
                        value={editForm.tags}
                        onChange={(e) =>
                          setEditForm({ ...editForm, tags: e.target.value })
                        }
                        disabled={isSaving}
                        className="w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">联系方式</label>
                      <input
                        value={editForm.contact}
                        onChange={(e) =>
                          setEditForm({ ...editForm, contact: e.target.value })
                        }
                        disabled={isSaving}
                        className="w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
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
                        disabled={isSaving}
                        className="w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={saveEdit}
                        disabled={isSaving}
                        className={getButtonClass(isSaving)}
                      >
                        {isSaving ? "保存中..." : "保存"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className={getButtonClass(isSaving)}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-lg font-semibold">{x.name}</div>

                    <div className="text-sm text-gray-600">
                      分类：{x.category} · 标签：{x.tags || "-"} · 联系方式：{x.contact || "-"}
                    </div>

                    <div className="text-sm">{x.description}</div>

                    {x.reason ? (
                      <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                        <div className="mb-1 font-medium text-gray-900">补充说明</div>
                        <div>{x.reason}</div>
                      </div>
                    ) : null}

                    <a
                      className="text-sm underline"
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
                            disabled={isBusy}
                            className={getButtonClass(isBusy)}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => approve(x.id)}
                            disabled={isBusy}
                            className={getButtonClass(rowBusy)}
                          >
                            {isApproving ? "通过中..." : "通过"}
                          </button>
                          <button
                            onClick={() => reject(x.id)}
                            disabled={isBusy}
                            className={getButtonClass(rowBusy)}
                          >
                            {isRejecting ? "拒绝中..." : "拒绝"}
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