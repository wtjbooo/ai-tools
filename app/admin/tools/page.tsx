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
  tutorial?: string; // 👈 新增：兼容后端传来的教程字段
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
  } | null;
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
  slug: string;
  website: string;
  logoUrl: string;
  description: string;
  content: string;
  tutorial: string; // 👈 新增：表单状态里的教程字段
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
  message?: string;
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

function StatPill({
  label,
  value,
  muted,
}: {
  label: string;
  value: string | number;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-sm ${
        muted ? "border-gray-200 text-gray-500" : "border-gray-300 text-gray-800"
      }`}
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function EditRuleBox() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="font-medium">编辑规范提醒</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-6 sm:text-sm">
        <li>description = 前台一句话简介，只写清楚“这是什么工具”。</li>
        <li>content = 前台产品简介，展示在详情页第一个 Tab。支持 Markdown。</li>
        <li>tutorial = 使用指南，展示在详情页第二个 Tab。支持 Markdown。</li>
        <li>不要把后台审核备注写进前台文案，reason 不应出现在这里。</li>
        <li>分类优先只保留一个主分类，标签控制在少而准。</li>
      </ul>
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    const res = await fetch("/api/admin/logout", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "退出失败");
      return;
    }
    router.replace("/admin");
  }

  async function load(nextRange = range, clearMsg = false) {
    setLoading(true);
    if (clearMsg) setMsg(null);

    const res = await fetch(
      `/api/admin/tools?range=${nextRange}&_t=${Date.now()}`,
      { cache: "no-store" }
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
      headers: { "Content-Type": "application/json" },
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

    await load(range);
    setMsg(isPublished ? "已重新发布工具" : "已下线工具");
  }

  async function toggleFeatured(id: string, featured: boolean) {
    setMsg(null);
    const res = await fetch("/api/admin/toggle-featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    await load(range);
    setMsg(featured ? "已设为推荐工具" : "已取消推荐");
  }

  function startEdit(tool: ToolItem) {
    setEditingId(tool.id);
    setEditForm({
      id: tool.id,
      name: tool.name,
      slug: tool.slug ?? "",
      website: tool.website ?? "",
      logoUrl: tool.logoUrl ?? "",
      description: tool.description ?? "",
      content: tool.content ?? "",
      tutorial: tool.tutorial ?? "", // 👈 新增：把老数据装载进表单
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
      headers: { "Content-Type": "application/json" },
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

    await load(range);
    setMsg(data.message ?? "工具保存成功");
    setEditingId(null);
    setEditForm(null);
  }

  async function deleteTool(tool: ToolItem) {
    if (tool.isPublished) {
      setMsg("请先下线工具，再执行删除");
      return;
    }

    const confirmed = window.confirm(
      `确认删除「${tool.name}」吗？\n\n此操作不可恢复，且可能影响历史统计与旧链接。`
    );

    if (!confirmed) return;

    setDeletingId(tool.id);
    setMsg(null);

    const res = await fetch("/api/admin/delete-tool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tool.id }),
    });

    const data = await res.json().catch(() => ({}));
    setDeletingId(null);

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized(data);
      return;
    }

    if (!res.ok) {
      setMsg(data.error ?? "删除失败");
      return;
    }

    await load(range);
    setMsg(data.message ?? "工具已删除");
  }

  async function backfillLogos(limit: number, force = false) {
    setBackfilling(true);
    setMsg(null);
    setBackfillLogs([]);

    const res = await fetch("/api/admin/backfill-logos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      if (sortMode === "rangeOutClicks") return (b.rangeOutClicks ?? 0) - (a.rangeOutClicks ?? 0);
      if (sortMode === "rangeViews") return (b.rangeViews ?? 0) - (a.rangeViews ?? 0);
      if (sortMode === "outClicks") return (b.outClicks ?? 0) - (a.outClicks ?? 0);
      if (sortMode === "views") return (b.views ?? 0) - (a.views ?? 0);
      if (sortMode === "clicks") return (b.clicks ?? 0) - (a.clicks ?? 0);
      if (sortMode === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortMode === "name") return a.name.localeCompare(b.name, "zh-CN");

      if (a.featured !== b.featured) return a.featured ? -1 : 1;

      const aFeaturedOrder = typeof a.featuredOrder === "number" ? a.featuredOrder : 0;
      const bFeaturedOrder = typeof b.featuredOrder === "number" ? b.featuredOrder : 0;

      if (a.featured && b.featured && aFeaturedOrder !== bFeaturedOrder) {
        return aFeaturedOrder - bFeaturedOrder;
      }

      const aRangeOutClicks = typeof a.rangeOutClicks === "number" ? a.rangeOutClicks : 0;
      const bRangeOutClicks = typeof b.rangeOutClicks === "number" ? b.rangeOutClicks : 0;
      if (aRangeOutClicks !== bRangeOutClicks) return bRangeOutClicks - aRangeOutClicks;

      const aRangeViews = typeof a.rangeViews === "number" ? a.rangeViews : 0;
      const bRangeViews = typeof b.rangeViews === "number" ? b.rangeViews : 0;
      if (aRangeViews !== bRangeViews) return bRangeViews - aRangeViews;

      const aOutClicks = typeof a.outClicks === "number" ? a.outClicks : 0;
      const bOutClicks = typeof b.outClicks === "number" ? b.outClicks : 0;
      if (aOutClicks !== bOutClicks) return bOutClicks - aOutClicks;

      const aViews = typeof a.views === "number" ? a.views : 0;
      const bViews = typeof b.views === "number" ? b.views : 0;
      if (aViews !== bViews) return bViews - aViews;

      const aClicks = typeof a.clicks === "number" ? a.clicks : 0;
      const bClicks = typeof b.clicks === "number" ? b.clicks : 0;
      if (aClicks !== bClicks) return bClicks - aClicks;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted;
  }, [list, keyword, publishFilter, featuredFilter, activityFilter, sortMode]);

  const summary = useMemo(() => {
    const totalTools = filteredAndSortedList.length;
    const totalRangeViews = filteredAndSortedList.reduce((sum, item) => sum + (item.rangeViews ?? 0), 0);
    const totalRangeOutClicks = filteredAndSortedList.reduce((sum, item) => sum + (item.rangeOutClicks ?? 0), 0);

    return { totalTools, totalRangeViews, totalRangeOutClicks };
  }, [filteredAndSortedList]);

  const hasActiveFilters =
    keyword ||
    publishFilter !== "all" ||
    featuredFilter !== "all" ||
    activityFilter !== "all" ||
    sortMode !== "default";

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">工具管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            查看工具表现，按当前区间快速筛选与排序
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link className="text-sm underline" href="/admin/submissions">
            审核队列
          </Link>
          <Link className="text-sm underline" href="/admin">
            后台概览
          </Link>
          <Link className="text-sm underline" href="/">
            返回首页
          </Link>
          <button onClick={logout} className="rounded border px-3 py-1 text-sm">
            退出登录
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">统计范围</div>
            <div className="mt-1 text-xs text-gray-500">
              当前区间：{rangeLabel}。区间浏览、区间官网点击、区间排序都会一起切换。
            </div>
          </div>

          <RangeTabs value={range} onChange={handleRangeChange} disabled={loading} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => load(range, true)} className="rounded border px-3 py-1 text-sm disabled:opacity-60" disabled={loading}>
          {loading ? "刷新中..." : "刷新"}
        </button>
        <button onClick={() => backfillLogos(5)} disabled={backfilling} className="rounded border px-3 py-1 text-sm disabled:opacity-60">
          {backfilling ? "处理中..." : "批量补 logo（5 条）"}
        </button>
        <button onClick={() => backfillLogos(20)} disabled={backfilling} className="rounded border px-3 py-1 text-sm disabled:opacity-60">
          {backfilling ? "处理中..." : "批量补 logo（20 条）"}
        </button>
        <button onClick={() => backfillLogos(5, true)} disabled={backfilling} className="rounded border px-3 py-1 text-sm disabled:opacity-60">
          {backfilling ? "处理中..." : "强制重补坏 logo（5 条）"}
        </button>
      </div>

      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-medium text-gray-900">筛选与排序</div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">关键词搜索</label>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索名称 / slug / 分类 / 标签" className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-600">发布状态</label>
            <select value={publishFilter} onChange={(e) => setPublishFilter(e.target.value as PublishFilter)} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="all">全部</option>
              <option value="published">已发布</option>
              <option value="hidden">已下线</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-600">推荐状态</label>
            <select value={featuredFilter} onChange={(e) => setFeaturedFilter(e.target.value as FeaturedFilter)} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="all">全部</option>
              <option value="featured">推荐</option>
              <option value="normal">非推荐</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-600">区间活跃</label>
            <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="all">全部工具</option>
              <option value="activeOnly">只看当前区间有数据</option>
              <option value="rangeOutClicksOnly">只看当前区间官网点击 &gt; 0</option>
              <option value="rangeViewsOnly">只看当前区间浏览 &gt; 0</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-600">排序方式</label>
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="w-full rounded-lg border px-3 py-2 text-sm">
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
          <span>原始总数：{list.length}</span>
          <span>当前结果：{summary.totalTools}</span>

          {hasActiveFilters ? (
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

      <div className="grid gap-3 sm:grid-cols-3">
        <StatPill label="当前结果工具数" value={summary.totalTools} />
        <StatPill label={`${rangeLabel}总浏览`} value={summary.totalRangeViews} />
        <StatPill label={`${rangeLabel}总官网点击`} value={summary.totalRangeOutClicks} />
      </div>

      {msg ? <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm">{msg}</div> : null}

      {backfillLogs.length > 0 ? (
        <div className="space-y-1 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="font-medium">本次批量补 logo 日志</div>
          {backfillLogs.map((log, index) => <div key={`${log}-${index}`}>{log}</div>)}
        </div>
      ) : null}

      {filteredAndSortedList.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {loading ? "加载中..." : "暂无符合条件的工具"}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedList.map((tool) => {
            const isEditing = editingId === tool.id && editForm;
            const showOutClicks = (tool.outClicks ?? 0) > 0;
            const showViews = (tool.views ?? 0) > 0;
            const showClicks = (tool.clicks ?? 0) > 0;
            const showRangeViews = (tool.rangeViews ?? 0) > 0;
            const showRangeOutClicks = (tool.rangeOutClicks ?? 0) > 0;
            const isDeleting = deletingId === tool.id;

            return (
              <div key={tool.id} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <EditRuleBox />

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">工具名称</label>
                        <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">slug</label>
                        <input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase() })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">官网链接</label>
                      <input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">一句话简介</label>
                      <textarea rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                    </div>

                    {/* 👇 Logo 链接手动补救框 👇 */}
<div className="mb-4">
  <label className="mb-1.5 block text-[13px] font-medium text-zinc-700">
    Logo 链接 (自动抓取失败时手动填写)
  </label>
  <input
    type="text"
    value={editForm.logoUrl || ""}
    onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-[14px] text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800"
    placeholder="填入图片直链，例如：https://你的图床.com/logo.png"
  />
</div>
{/* 👆 Logo 框结束 👆 */}

                    <div>
                      <label className="mb-1 block text-sm font-bold text-blue-600">产品简介 (Content)</label>
                      <textarea rows={8} value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} className="w-full rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-2 text-sm font-mono" placeholder="支持 Markdown..." />
                    </div>

                    {/* 👇 新增：保姆级教程的编辑框 👇 */}
                    <div>
                      <label className="mb-1 block text-sm font-bold text-purple-600">使用指南 (Tutorial)</label>
                      <textarea rows={8} value={editForm.tutorial} onChange={(e) => setEditForm({ ...editForm, tutorial: e.target.value })} className="w-full rounded-lg border border-purple-200 bg-purple-50/30 px-3 py-2 text-sm font-mono" placeholder="支持 Markdown，如果没有教程可以留空..." />
                    </div>
                    {/* 👆 新增结束 👆 */}

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">分类</label>
                        <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">标签</label>
                        <input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button onClick={saveEdit} disabled={saving} className="rounded border bg-black text-white px-6 py-2 text-sm font-medium disabled:opacity-60">
                        {saving ? "保存中..." : "保存修改"}
                      </button>
                      <button onClick={cancelEdit} disabled={saving} className="rounded border px-6 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-lg font-semibold text-gray-950">{tool.name}</div>
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${tool.isPublished ? "bg-gray-100" : "bg-white"}`}>{tool.isPublished ? "已发布" : "已下线"}</span>
                          {tool.featured ? <span className="rounded-full border bg-yellow-100 px-2 py-0.5 text-xs">推荐</span> : null}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">slug：{tool.slug} · 分类：{tool.category?.name || "未分类"}</div>
                        <div className="mt-2 line-clamp-2 text-sm text-gray-700">{tool.description || "暂无简介"}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button onClick={() => startEdit(tool)} className="rounded border px-3 py-1 text-sm bg-gray-50 font-medium">编辑</button>
                      <button onClick={() => toggleFeatured(tool.id, !tool.featured)} className="rounded border px-3 py-1 text-sm">{tool.featured ? "取消推荐" : "设为推荐"}</button>
                      {tool.isPublished ? (
                        <button onClick={() => toggleTool(tool.id, false)} className="rounded border px-3 py-1 text-sm">下线</button>
                      ) : (
                        <button onClick={() => toggleTool(tool.id, true)} className="rounded border px-3 py-1 text-sm">重新发布</button>
                      )}
                      {!tool.isPublished ? (
                        <button onClick={() => deleteTool(tool)} disabled={isDeleting} className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60">{isDeleting ? "删除中..." : "删除"}</button>
                      ) : null}
                      <Link href={`/tool/${tool.slug}`} className="rounded border px-3 py-1 text-sm">查看前台详情</Link>
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