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
  rangeViews: number;
  rangeOutClicks: number;
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
type RangeMode = "7d" | "30d" | "all";
type ActivityFilter =
  | "all"
  | "activeOnly"
  | "rangeOutClicksOnly"
  | "rangeViewsOnly";
type SortMode =
  | "default"
  | "rangeOutClicks"
  | "rangeViews"
  | "outClicks"
  | "views"
  | "clicks"
  | "createdAt"
  | "name";

type ToolsResponse = {
  meta?: {
    range?: RangeMode;
    rangeLabel?: string;
  };
  list?: ToolItem[];
  error?: string;
};

function RangeTabs({
  value,
  onChange,
  disabled,
}: {
  value: RangeMode;
  onChange: (next: RangeMode) => void;
  disabled?: boolean;
}) {
  const items: Array<{ value: RangeMode; label: string }> = [
    { value: "7d", label: "7 天" },
    { value: "30d", label: "30 天" },
    { value: "all", label: "全部" },
  ];

  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
      {items.map((item) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            disabled={disabled}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              active
                ? "bg-gray-950 text-white"
                : "text-gray-600 hover:bg-gray-50"
            } disabled:opacity-60`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

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
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [range, setRange] = useState<RangeMode>("7d");
  const [rangeLabel, setRangeLabel] = useState("最近 7 天");

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

  async function load(nextRange = range, clearMsg = false) {
    setLoading(true);

    if (clearMsg) {
      setMsg(null);
    }

    const res = await fetch(
      `/api/admin/tools?range=${nextRange}&_t=${Date.now()}`,
      {
        cache: "no-store",
      }
    );
    const data: ToolsResponse = await res.json().catch(() => ({}));

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
    setRangeLabel(data.meta?.rangeLabel ?? "最近 7 天");
  }

  useEffect(() => {
    load(range, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRangeChange(nextRange: RangeMode) {
    if (nextRange === range || loading) return;
    setRange(nextRange);
    await load(nextRange, true);
  }

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
    await load(range);
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
    await load(range);
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
    await load(range);
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
    await load(range);
  }

  const filteredAndSortedList = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    const filtered = list.filter((tool) => {
      if (publishFilter === "published" && !tool.isPublished) return false;
      if (publishFilter === "hidden" && tool.isPublished) return false;

      if (featuredFilter === "featured" && !tool.featured) return false;
      if (featuredFilter === "normal" && tool.featured) return false;

      if (activityFilter === "activeOnly") {
        const hasRangeData =
          (tool.rangeViews ?? 0) > 0 || (tool.rangeOutClicks ?? 0) > 0;
        if (!hasRangeData) return false;
      }

      if (activityFilter === "rangeOutClicksOnly") {
        if ((tool.rangeOutClicks ?? 0) <= 0) return false;
      }

      if (activityFilter === "rangeViewsOnly") {
        if ((tool.rangeViews ?? 0) <= 0) return false;
      }

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
      if (sortMode === "rangeOutClicks") {
        return (b.rangeOutClicks ?? 0) - (a.rangeOutClicks ?? 0);
      }

      if (sortMode === "rangeViews") {
        return (b.rangeViews ?? 0) - (a.rangeViews ?? 0);
      }

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
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

      const aRangeOutClicks =
        typeof a.rangeOutClicks === "number" ? a.rangeOutClicks : 0;
      const bRangeOutClicks =
        typeof b.rangeOutClicks === "number" ? b.rangeOutClicks : 0;
      if (aRangeOutClicks !== bRangeOutClicks) {
        return bRangeOutClicks - aRangeOutClicks;
      }

      const aRangeViews = typeof a.rangeViews === "number" ? a.rangeViews : 0;
      const bRangeViews = typeof b.rangeViews === "number" ? b.rangeViews : 0;
      if (aRangeViews !== bRangeViews) {
        return bRangeViews - aRangeViews;
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

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted;
  }, [list, keyword, publishFilter, featuredFilter, activityFilter, sortMode]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
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

      <div className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-medium">统计范围</div>
            <div className="mt-1 text-xs text-gray-500">
              当前区间：{rangeLabel}。区间浏览 / 区间官网点击与对应排序都会跟随切换。
            </div>
          </div>

          <RangeTabs
            value={range}
            onChange={handleRangeChange}
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => load(range, true)}
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

      <div className="space-y-3 rounded-xl border p-4">
        <div className="text-sm font-medium">筛选与排序</div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
            <label className="block text-sm text-gray-600">区间活跃</label>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="all">全部工具</option>
              <option value="activeOnly">只看当前区间有数据</option>
              <option value="rangeOutClicksOnly">只看当前区间官网点击 &gt; 0</option>
              <option value="rangeViewsOnly">只看当前区间浏览 &gt; 0</option>
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
              <option value="rangeOutClicks">{rangeLabel}官网点击最高</option>
              <option value="rangeViews">{rangeLabel}浏览最高</option>
              <option value="outClicks">累计官网点击最高</option>
              <option value="views">累计浏览最高</option>
              <option value="clicks">历史点击最高</option>
              <option value="createdAt">最新创建</option>
              <option value="name">名称 A-Z</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>总数：{list.length}</span>
          <span>筛选后：{filteredAndSortedList.length}</span>

          {keyword ||
          publishFilter !== "all" ||
          featuredFilter !== "all" ||
          activityFilter !== "all" ||
          sortMode !== "default" ? (
            <button
              onClick={() => {
                setKeyword("");
                setPublishFilter("all");
                setFeaturedFilter("all");
                setActivityFilter("all");
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
        <div className="space-y-1 rounded border bg-gray-50 p-3 text-sm">
          <div className="font-medium">本次批量补 logo 日志</div>
          {backfillLogs.map((log, index) => (
            <div key={`${log}-${index}`}>{log}</div>
          ))}
        </div>
      ) : null}

      {filteredAndSortedList.length === 0 ? (
        <div className="text-gray-600">
          {loading ? "加载中..." : "暂无符合条件的工具"}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedList.map((tool) => {
            const isEditing = editingId === tool.id && editForm;
            const showOutClicks =
              typeof tool.outClicks === "number" && tool.outClicks > 0;
            const showViews = typeof tool.views === "number" && tool.views > 0;
            const showClicks = typeof tool.clicks === "number" && tool.clicks > 0;
            const showRangeViews =
              typeof tool.rangeViews === "number" && tool.rangeViews > 0;
            const showRangeOutClicks =
              typeof tool.rangeOutClicks === "number" && tool.rangeOutClicks > 0;

            return (
              <div key={tool.id} className="space-y-3 rounded-xl border p-4">
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

                      {showRangeOutClicks ? (
                        <span className="rounded-full border px-2 py-1">
                          {rangeLabel}官网点击：{tool.rangeOutClicks}
                        </span>
                      ) : (
                        <span className="rounded-full border px-2 py-1 text-gray-400">
                          {rangeLabel}官网点击：0
                        </span>
                      )}

                      {showRangeViews ? (
                        <span className="rounded-full border px-2 py-1">
                          {rangeLabel}浏览：{tool.rangeViews}
                        </span>
                      ) : (
                        <span className="rounded-full border px-2 py-1 text-gray-400">
                          {rangeLabel}浏览：0
                        </span>
                      )}

                      {showOutClicks ? (
                        <span className="rounded-full border px-2 py-1">
                          累计官网点击：{tool.outClicks}
                        </span>
                      ) : null}

                      {showViews ? (
                        <span className="rounded-full border px-2 py-1">
                          累计浏览：{tool.views}
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