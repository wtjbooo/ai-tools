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
  tutorial?: string; 
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
  tutorial: string; 
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
  | "rangeOutClicksDesc";

export default function AdminToolsPage() {
  const router = useRouter();
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("all");
  const [rangeMode, setRangeMode] = useState<RangeMode>("7d");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditToolForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTools();
  }, []);

  async function fetchTools() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/list-tools");
      const data = await res.json();
      setTools(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(tool: ToolItem) {
    setEditingId(tool.id);
    setEditForm({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      website: tool.website || "",
      logoUrl: tool.logoUrl || "",
      description: tool.description,
      content: tool.content,
      tutorial: tool.tutorial || "",
      category: tool.category?.name || "",
      tags: tool.tags.map((t) => t.tag.name).join(", "),
      featuredOrder: String(tool.featuredOrder),
    });
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  // --- 新增：图片上传处理函数 ---
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, field: "content" | "tutorial") {
    const file = e.target.files?.[0];
    if (!file || !editForm) return;

    if (!file.type.startsWith("image/")) {
      alert("只能上传图片文件");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setSaving(true);
    setMsg("正在上传图片...");
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");

      const markdownImage = `\n![${file.name}](${data.url})\n`;
      
      setEditForm({
        ...editForm,
        [field]: editForm[field] + markdownImage
      });
      
      setMsg("图片上传成功并已插入");
    } catch (error: any) {
      alert(error.message);
      setMsg("上传失败");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  }

  async function saveEdit() {
    if (!editForm) return;

    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/update-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          featuredOrder: Number(editForm.featuredOrder || "0"),
        }),
      });

      if (res.ok) {
        setMsg("已保存");
        await fetchTools();
        setTimeout(() => {
          setEditingId(null);
          setEditForm(null);
        }, 1000);
      } else {
        const data = await res.json();
        setMsg(data.error || "保存失败");
      }
    } catch (err) {
      setMsg("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTool(id: string, publish: boolean) {
    try {
      await fetch("/api/admin/update-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPublished: publish }),
      });
      fetchTools();
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleFeatured(id: string, featured: boolean) {
    try {
      await fetch("/api/admin/update-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, featured }),
      });
      fetchTools();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteTool(tool: ToolItem) {
    if (tool.isPublished) return;
    if (!confirm(`确定要永久删除工具 "${tool.name}" 吗？此操作不可撤销。`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tool.id }),
      });

      if (res.ok) {
        alert("已删除");
        fetchTools();
      } else {
        const data = await res.json();
        alert(data.error || "删除失败");
      }
    } catch (err) {
      alert("网络错误");
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredTools = useMemo(() => {
    let result = [...tools];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.description.toLowerCase().includes(s) ||
          t.category?.name.toLowerCase().includes(s)
      );
    }

    if (publishFilter === "published") {
      result = result.filter((t) => t.isPublished);
    } else if (publishFilter === "hidden") {
      result = result.filter((t) => !t.isPublished);
    }

    if (featuredFilter === "featured") {
      result = result.filter((t) => t.featured);
    } else if (featuredFilter === "normal") {
      result = result.filter((t) => !t.featured);
    }

    if (activityFilter === "activeOnly") {
      result = result.filter((t) => t.rangeOutClicks > 0);
    } else if (activityFilter === "rangeOutClicksDesc") {
      result.sort((a, b) => b.rangeOutClicks - a.rangeOutClicks);
    }

    return result;
  }, [tools, search, publishFilter, featuredFilter, activityFilter]);

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工具管理 ({filteredTools.length})</h1>
          <p className="mt-1 text-sm text-gray-500">编辑、下线或删除收录的工具</p>
        </div>
        <Link
          href="/admin/approve"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          去审核新提交
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="text"
          placeholder="搜索名称、简介、分类..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={publishFilter}
          onChange={(e) => setPublishFilter(e.target.value as PublishFilter)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
        >
          <option value="all">所有状态</option>
          <option value="published">已发布</option>
          <option value="hidden">已下线</option>
        </select>
        <select
          value={featuredFilter}
          onChange={(e) => setFeaturedFilter(e.target.value as FeaturedFilter)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
        >
          <option value="all">所有推荐</option>
          <option value="featured">推荐中</option>
          <option value="normal">非推荐</option>
        </select>
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
        >
          <option value="all">默认排序</option>
          <option value="activeOnly">仅显示有点击的</option>
          <option value="rangeOutClicksDesc">按近 {rangeMode} 点击降序</option>
        </select>
        <div className="flex rounded-lg border p-1 bg-white">
          {(["7d", "30d", "all"] as RangeMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setRangeMode(m)}
              className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
                rangeMode === m ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "7d" ? "7天" : m === "30d" ? "30天" : "总计"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTools.map((tool) => {
          const isEditing = editingId === tool.id;

          return (
            <div
              key={tool.id}
              className={`rounded-xl border bg-white p-4 transition-all ${
                isEditing ? "ring-2 ring-blue-500" : "hover:border-gray-300"
              }`}
            >
              {isEditing && editForm ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">名称</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full rounded border px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">Slug (URL 路径)</label>
                      <input
                        type="text"
                        value={editForm.slug}
                        onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                        className="w-full rounded border px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">分类</label>
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full rounded border px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">标签 (逗号分隔)</label>
                      <input
                        type="text"
                        value={editForm.tags}
                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        className="w-full rounded border px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">网站地址</label>
                      <input
                        type="text"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                        className="w-full rounded border px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">Logo 地址</label>
                      <input
                        type="text"
                        value={editForm.logoUrl}
                        onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                        className="w-full rounded border px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">一句话描述 (Description)</label>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full rounded border px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-bold text-blue-600">产品简介 (Content)</label>
                      <label className="cursor-pointer text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition">
                        <span>📷 上传图片到 R2</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => handleFileUpload(e, "content")} 
                        />
                      </label>
                    </div>
                    <textarea
                      rows={8}
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      className="w-full rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-2 text-sm font-mono"
                      placeholder="支持 Markdown..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-bold text-purple-600">使用指南 (Tutorial)</label>
                      <label className="cursor-pointer text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition">
                        <span>📷 上传图片到 R2</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => handleFileUpload(e, "tutorial")} 
                        />
                      </label>
                    </div>
                    <textarea
                      rows={8}
                      value={editForm.tutorial}
                      onChange={(e) => setEditForm({ ...editForm, tutorial: e.target.value })}
                      className="w-full rounded-lg border border-purple-200 bg-purple-50/30 px-3 py-2 text-sm font-mono"
                      placeholder="支持 Markdown，如果没有教程可以留空..."
                    />
                  </div>

                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">排序权重:</span>
                        <input
                          type="number"
                          value={editForm.featuredOrder}
                          onChange={(e) => setEditForm({ ...editForm, featuredOrder: e.target.value })}
                          className="w-16 rounded border px-2 py-1"
                        />
                      </div>
                      {msg && <span className="font-medium text-blue-600">{msg}</span>}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={cancelEdit}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                      >
                        取消
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? "保存中..." : "保存修改"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      {tool.logoUrl ? (
                        <img src={tool.logoUrl} alt={tool.name} className="h-12 w-12 rounded-lg object-contain bg-gray-50 p-1" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gray-100" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{tool.name}</h3>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                            {tool.category?.name || "未分类"}
                          </span>
                          {tool.featured && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              推荐 #{tool.featuredOrder}
                            </span>
                          )}
                          {!tool.isPublished && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                              已下线
                            </span>
                          )}
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm text-gray-700">{tool.description || "暂无简介"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => startEdit(tool)} className="rounded border px-3 py-1 text-sm bg-gray-50 font-medium">编辑</button>
                    <button onClick={() => toggleFeatured(tool.id, !tool.featured)} className="rounded border px-3 py-1 text-sm">
                      {tool.featured ? "取消推荐" : "设为推荐"}
                    </button>
                    {tool.isPublished ? (
                      <button onClick={() => toggleTool(tool.id, false)} className="rounded border px-3 py-1 text-sm">下线</button>
                    ) : (
                      <button onClick={() => toggleTool(tool.id, true)} className="rounded border px-3 py-1 text-sm">重新发布</button>
                    )}
                    {!tool.isPublished ? (
                      <button onClick={() => deleteTool(tool)} disabled={isDeleting} className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60">
                        {isDeleting ? "删除中..." : "删除"}
                      </button>
                    ) : null}
                    <Link href={`/tool/${tool.slug}`} className="rounded border px-3 py-1 text-sm">查看前台详情</Link>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}