"use client";

import { useEffect, useMemo, useState } from "react";
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
  featured: boolean;
  featuredOrder: number;
  clicks: number;
  views: number;
  outClicks: number;
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
  featuredOrder: string;
};

type PublishFilter = "all" | "published" | "hidden";
type FeaturedFilter = "all" | "featured" | "normal";
type SortMode =
  | "default"
  | "outClicks"
  | "views"
  | "clicks"
  | "createdAt"
  | "name";

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

  const [keyword, setKeyword] = useState("");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");

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

    const res = await fetch(`/api/admin/tools?_t=${Date.now()}`, {
      cache: "no-store",
    });
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
    router.refresh();
    await load();
  }

  async function toggleFeatured(id: string, featured: boolean) {
    setMsg(null);

    const res = await fetch("/api/admin/toggle-featured", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, featured }),
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

    setMsg(featured ? "已设为推荐工具" : "已取消推荐");
    router.refresh();
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
      featuredOrder: String(tool.featuredOrder ?? 0),
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
      body: JSON.stringify({
        ...editForm,
        featuredOrder: Number(editForm.featuredOrder || "0"),
      }),
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

  const filteredAndSortedList = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    const filtered = list.filter((tool) => {
      if (publishFilter === "published" && !tool.isPublished) return false;
      if (publishFilter === "hidden" && tool.isPublished) return false;

      if (featuredFilter === "featured" && !tool.featured) return false;
      if (featuredFilter === "normal" && tool.featured) return false;

      if (!q) return true;

      const haystack = [
        tool.name,
        tool.slug,
        tool.description,
        tool.category?.name ?? "",
        ...(tool.tags ?? []).map((item) => item.tag.name),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "outClicks") {
        return (b.outClicks ?? 0) - (a.outClicks ?? 0);
      }

      if (sortMode === "views") {
        return (b.views ?? 0) - (a.views ?? 0);
      }

      if (sortMode === "clicks") {
        return (b.clicks ?? 0) - (a.clicks ?? 0);
      }

      if (sortMode === "createdAt") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

      if (sortMode === "name") {
        return a.name.localeCompare(b.name, "zh-CN");
      }

      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1;
      }

      const aFeaturedOrder =
        typeof a.featuredOrder === "number" ? a.featuredOrder : 0;
      const bFeaturedOrder =
        typeof b.featuredOrder === "number" ? b.featuredOrder : 0;

      if (a.featured && b.featured && aFeaturedOrder !== bFeaturedOrder) {
        return aFeaturedOrder - bFeaturedOrder;
      }

      const aOutClicks = typeof a.outClicks === "number" ? a.outClicks : 0;
      const bOutClicks = typeof b.outClicks === "number" ? b.outClicks : 0;
      if (aOutClicks !== bOutClicks) {
        return bOutClicks - aOutClicks;
      }

      const aViews = typeof a.views === "number" ? a.views : 0;
      const bViews = typeof b.views === "number" ? b.views : 0;
      if (aViews !== bViews) {
        return bViews - aViews;
      }

      const aClicks = typeof a.clicks === "number" ? a.clicks : 0;
      const bClicks = typeof b.clicks === "number" ? b.clicks : 0;
      if (aClicks !== bClicks) {
        return bClicks - aClicks;
      }

      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return sorted;
  }, [list, keyword, publishFilter, featuredFilter, sortMode]);

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

      <div className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">筛选与排序</div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">关键词搜索</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索名称 / slug / 分类 / 标签"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-600">发布状态</label>
            <select
              value={publishFilter}
              onChange={(e) => setPublishFilter(e.target.value as PublishFilter)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="all">全部</option>
              <option value="published">已发布</option>
              <option value="hidden">已隐藏</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-600">推荐状态</label>
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value as FeaturedFilter)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="all">全部</option>
              <option value="featured">推荐</option>
              <option value="normal">非推荐</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-600">排序方式</label>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="default">默认排序</option>
              <option value="outClicks">官网点击最高</option>
              <option value="views">浏览最高</option>
              <option value="clicks">历史点击最高</option>
              <option value="createdAt">最新创建</option>
              <option value="name">名称 A-Z</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>总数：{list.length}</span>
          <span>筛选后：{filteredAndSortedList.length}</span>

          {(keyword || publishFilter !== "all" || featuredFilter !== "all" || sortMode !== "default") ? (
            <button
              onClick={() => {
                setKeyword("");
                setPublishFilter("all");
                setFeaturedFilter("all");
                setSortMode("default");
              }}
              className="rounded border px-2 py-1 text-xs text-gray-700"
            >
              清空筛选
            </button>
          ) : null}
        </div>
      </div>

      {msg ? <div className="rounded border p-3 text-sm">{msg}</div> : null}

      {backfillLogs.length > 0 ? (
        <div className="rounded border bg-gray-50 p-3 text-sm space-y-1">
          <div className="font-medium">本次批量补 logo 日志</div>
          {backfillLogs.map((log, index) => (
            <div key={`${log}-${index}`}>{log}</div>
          ))}
        </div>
      ) : null}

      {filteredAndSortedList.length === 0 ? (
        <div className="text-gray-600">{loading ? "加载中..." : "暂无符合条件的工具"}</div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedList.map((tool) => {
            const isEditing = editingId === tool.id && editForm;
            const showOutClicks =
              typeof tool.outClicks === "number" && tool.outClicks > 0;
            const showViews = typeof tool.views === "number" && tool.views > 0;
            const showClicks = typeof tool.clicks === "number" && tool.clicks > 0;

            return (
              <div key={tool.id} className="rounded-xl border p-4 space-y-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        工具名称
                      </label>
                      <input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        官网链接
                      </label>
                      <input
                        value={editForm.website}
                        onChange={(e) =>
                          setEditForm({ ...editForm, website: e.target.value })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        logoUrl
                      </label>
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
                      <label className="mb-1 block text-sm font-medium">
                        一句话简介
                      </label>
                      <textarea
                        rows={3}
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        详细介绍
                      </label>
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
                      <label className="mb-1 block text-sm font-medium">
                        分类
                      </label>
                      <input
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm({ ...editForm, category: e.target.value })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        这里只填一个主分类，例如：视频生成。不要填写“聊天助手 / 视频生成”这种多个分类组合。
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        标签
                      </label>
                      <input
                        value={editForm.tags}
                        onChange={(e) =>
                          setEditForm({ ...editForm, tags: e.target.value })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        推荐顺序
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editForm.featuredOrder}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            featuredOrder: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        数字越小越靠前。通常填 1、2、3、4……
                      </p>
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

                      <div className="flex gap-2">
                        <div
                          className={`rounded-full px-3 py-1 text-xs border ${
                            tool.isPublished ? "bg-gray-100" : "bg-white"
                          }`}
                        >
                          {tool.isPublished ? "已发布" : "已隐藏"}
                        </div>

                        {tool.featured ? (
                          <div className="rounded-full border bg-yellow-100 px-3 py-1 text-xs">
                            推荐
                          </div>
                        ) : null}
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

                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                      <span className="rounded-full border px-2 py-1">
                        推荐顺序：{tool.featuredOrder ?? 0}
                      </span>

                      {showOutClicks ? (
                        <span className="rounded-full border px-2 py-1">
                          官网点击：{tool.outClicks}
                        </span>
                      ) : null}

                      {showViews ? (
                        <span className="rounded-full border px-2 py-1">
                          浏览：{tool.views}
                        </span>
                      ) : null}

                      {showClicks ? (
                        <span className="rounded-full border px-2 py-1">
                          历史点击：{tool.clicks}
                        </span>
                      ) : null}
                    </div>

                    {tool.logoUrl ? (
                      <div className="break-all text-xs text-gray-500">
                        logoUrl：{tool.logoUrl}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">logoUrl：未设置</div>
                    )}

                    {tool.website ? (
                      <a
                        className="text-sm underline"
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

                      <button
                        onClick={() => toggleFeatured(tool.id, !tool.featured)}
                        className="rounded border px-3 py-1 text-sm"
                      >
                        {tool.featured ? "取消推荐" : "设为推荐"}
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