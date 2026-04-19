"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

type NoticeType = "success" | "error" | "info" | null;

const CATEGORY_SUGGESTIONS = [
  "聊天助手", "图像生成", "视频生成", "写作助手", "搜索问答",
  "编程开发", "办公效率", "翻译工具", "语音工具", "PPT 生成",
];

const TAG_SUGGESTIONS = [
  "免费试用", "中文支持", "多模型", "API", "文生图",
  "视频编辑", "团队协作", "效率工具", "内容创作", "办公自动化",
];

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function validateSingleCategoryName(raw: string) {
  const value = normalizeSpaces(raw || "");
  if (!value) return "分类不能为空";
  if (/[\/\\|]+/.test(value) || /,|，|、/.test(value)) return "分类只能填写一个主分类，不能填写组合值";
  const lower = value.toLowerCase();
  if (lower === "category" || lower === "categories" || lower === "uncategorized" || lower === "unknown") return "分类值无效，请填写真实分类名称";
  if (value.length < 2 || value.length > 50) return "分类长度需在 2 到 50 个字符之间";
  return "";
}

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string; }) {
  return (
    <div className="space-y-2.5">
      <label htmlFor={htmlFor} className="block text-[14px] font-semibold tracking-wide text-zinc-900">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[13px] leading-6 text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function Notice({ type, message }: { type: NoticeType; message: string; }) {
  if (!type) return null;
  const styles =
    type === "success"
      ? { box: "border-emerald-200/60 bg-emerald-50/80 text-emerald-900", icon: "bg-emerald-100 text-emerald-700", title: "已完成", symbol: "✓" }
      : type === "info"
      ? { box: "border-blue-200/60 bg-blue-50/80 text-blue-900", icon: "bg-blue-100 text-blue-700", title: "提示", symbol: "i" }
      : { box: "border-red-200/60 bg-red-50/80 text-red-900", icon: "bg-red-100 text-red-700", title: "请检查", symbol: "!" };

  return (
    <div className={["rounded-[24px] border px-5 py-4 text-sm leading-relaxed shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2", styles.box].join(" ")}>
      <div className="flex items-start gap-3.5">
        <div className={["mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", styles.icon].join(" ")}>{styles.symbol}</div>
        <div className="min-w-0">
          <div className="font-semibold">{styles.title}</div>
          <div className="mt-1 text-[13.5px] opacity-90">{message}</div>
        </div>
      </div>
    </div>
  );
}

function SuggestionPill({ children, onClick }: { children: ReactNode; onClick: () => void; }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center rounded-full border border-black/[0.06] bg-white px-3.5 py-1.5 text-[12px] font-medium text-zinc-600 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:border-black/[0.1] hover:bg-zinc-50 hover:text-zinc-950 active:scale-[0.96]">
      {children}
    </button>
  );
}

function IntroPill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-black/[0.04] bg-white/60 backdrop-blur-md px-3.5 py-2 text-[13px] font-medium text-zinc-600 shadow-sm">
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-[18px] border border-black/[0.08] bg-zinc-50/50 px-4 py-3.5 text-[14px] font-medium text-zinc-900 outline-none transition-all duration-300 ease-out placeholder:text-zinc-400 placeholder:font-normal focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-900/5 shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:border-black/[0.15]";

export default function SubmitForm() {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [noticeType, setNoticeType] = useState<NoticeType>(null);
  const [submitted, setSubmitted] = useState(false);

  const [nameValue, setNameValue] = useState("");
  const [websiteValue, setWebsiteValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [categoryValue, setCategoryValue] = useState("");
  const [tagsValue, setTagsValue] = useState("");
  
  // 新增：Markdown 状态管理
  const [contentValue, setContentValue] = useState("");
  const [tutorialValue, setTutorialValue] = useState("");

  function applyCategorySuggestion(value: string) { setCategoryValue(value); }

  function applyTagSuggestion(value: string) {
    const current = tagsValue.trim();
    if (!current) { setTagsValue(value); return; }
    const parts = current.split(/,|，/).map((item) => normalizeSpaces(item)).filter(Boolean);
    if (parts.includes(value)) return;
    setTagsValue(`${parts.join(", ")}${parts.length ? ", " : ""}${value}`);
  }

  async function handleExtractWebsiteInfo() {
    const website = websiteValue.trim();
    if (!website) {
      setMsg("请先填写官网链接，再尝试自动获取网站信息。");
      setNoticeType("error");
      return;
    }
    setExtracting(true);
    setMsg(null);
    setNoticeType(null);

    try {
      const res = await fetch("/api/submit/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setMsg(data?.error ?? "未能自动获取网站信息，你仍然可以手动填写后提交。");
        setNoticeType("info");
        return;
      }
      const extractedName = String(data?.data?.name ?? "").trim();
      const extractedDescription = String(data?.data?.description ?? "").trim();
      let filledCount = 0;
      if (extractedName && !nameValue.trim()) { setNameValue(extractedName); filledCount += 1; }
      if (extractedDescription && !descriptionValue.trim()) { setDescriptionValue(extractedDescription); filledCount += 1; }

      if (filledCount > 0) {
        setMsg("已自动填入部分网站信息，请确认后再提交。");
        setNoticeType("success");
      } else {
        setMsg("已获取到网站信息，但你的表单里已有内容，未自动覆盖。");
        setNoticeType("info");
      }
    } catch (error) {
      console.error("extract website info error:", error);
      setMsg("自动获取失败，你仍然可以手动填写后提交。");
      setNoticeType("info");
    } finally {
      setExtracting(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setNoticeType(null);
    setSubmitted(false);
    setLoading(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const rawCategory = String(fd.get("category") ?? "");
    const categoryError = validateSingleCategoryName(rawCategory);

    if (categoryError) {
      setMsg(categoryError);
      setNoticeType("error");
      setLoading(false);
      return;
    }
    fd.set("category", normalizeSpaces(rawCategory));
    
    // 💡 这里的 payload 已经自动包含了 name="content" 和 name="tutorial" 的数据
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
        setNoticeType("error");
        setSubmitted(false);
      } else {
        setMsg("我们已经收到你的工具提交，并已进入审核队列。通常会在 1 到 3 天内完成审核。");
        setNoticeType("success");
        setSubmitted(true);
        form.reset();
        setNameValue("");
        setWebsiteValue("");
        setDescriptionValue("");
        setCategoryValue("");
        setTagsValue("");
        setContentValue("");
        setTutorialValue("");
      }
    } catch (error) {
      console.error("submit form error:", error);
      setMsg("网络异常，请稍后重试。");
      setNoticeType("error");
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-12">
      <div className="space-y-6 sm:space-y-10">
        <section className="relative overflow-hidden rounded-[36px] border border-black/[0.04] bg-white px-6 py-10 shadow-[0_8px_40px_rgba(0,0,0,0.03)] sm:px-12 sm:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.08),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.05),transparent_40%)]" />
          <div className="relative max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/" className="inline-flex items-center rounded-full border border-black/[0.06] bg-white px-4 py-2 text-[13px] font-medium text-zinc-600 shadow-sm transition hover:-translate-y-0.5 hover:border-black/[0.1] hover:text-zinc-900">← 返回首页</Link>
              <span className="inline-flex items-center rounded-full border border-transparent px-3 py-1 text-[11px] font-bold tracking-[0.2em] text-zinc-400">SUBMIT AI TOOL</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-[32px] font-bold tracking-tight text-zinc-900 sm:text-[48px] sm:leading-[1.1]">提交你的 AI 工具</h1>
              <p className="max-w-2xl text-[15px] leading-relaxed text-zinc-500 sm:text-[16px]">填写官网、简介与分类信息，我们将会在审核后将其收录进全网最具质感的 AI 导航目录中，获得海量曝光。</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <IntroPill>✨ 支持一键提取官网信息</IntroPill>
              <IntroPill>🎯 推荐只填一个精准主分类</IntroPill>
              <IntroPill>⏱️ 预计 1～3 个工作日完成审核</IntroPill>
            </div>
          </div>
        </section>

        <form onSubmit={onSubmit} className="rounded-[32px] border border-black/[0.04] bg-white p-6 shadow-[0_12px_48px_rgba(0,0,0,0.04)] sm:p-10 space-y-8">
          <div className="grid gap-10 lg:grid-cols-2">
            {/* 左侧：基础信息 */}
            <div className="space-y-8 rounded-[24px] bg-zinc-50/50 p-6 sm:p-8">
              <div className="space-y-1.5">
                <h2 className="text-[20px] font-bold tracking-tight text-zinc-900">基础信息</h2>
                <p className="text-[14px] leading-6 text-zinc-500">先填写官网，我们能帮你自动补全大部分内容。</p>
              </div>
              <div className="space-y-6">
                <Field label="官网链接" htmlFor="website" hint="建议优先填写，可大幅节省您的时间。">
                  <div className="space-y-3">
                    <input id="website" name="website" type="url" placeholder="https://example.com" className={inputClass} required value={websiteValue} onChange={(e) => setWebsiteValue(e.target.value)} />
                    <button type="button" onClick={handleExtractWebsiteInfo} disabled={extracting || loading} className="inline-flex w-full items-center justify-center rounded-[16px] border border-black/[0.06] bg-white px-4 py-3 text-[14px] font-medium text-zinc-700 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:border-black/[0.12] hover:bg-zinc-50 hover:text-zinc-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                      {extracting ? "正在解析官网元数据..." : "自动获取网站信息"}
                    </button>
                  </div>
                </Field>
                <Field label="工具名称" htmlFor="name">
                  <input id="name" name="name" placeholder="例如：ChatGPT" className={inputClass} required value={nameValue} onChange={(e) => setNameValue(e.target.value)} />
                </Field>
                <Field label="一句话简介" htmlFor="description">
                  <input id="description" name="description" placeholder="例如：OpenAI 推出的划时代 AI 对话助手" className={inputClass} required value={descriptionValue} onChange={(e) => setDescriptionValue(e.target.value)} />
                </Field>
              </div>
            </div>

            {/* 右侧：分类与补充 */}
            <div className="space-y-8 rounded-[24px] bg-zinc-50/50 p-6 sm:p-8">
              <div className="space-y-1.5">
                <h2 className="text-[20px] font-bold tracking-tight text-zinc-900">分类与补充</h2>
                <p className="text-[14px] leading-6 text-zinc-500">精准的分类和标签，能让用户更快搜索到它。</p>
              </div>
              <div className="space-y-6">
                <Field label="主分类" htmlFor="category" hint="只填一个，帮助算法精准分发。">
                  <input id="category" name="category" placeholder="例如：聊天助手" className={inputClass} required value={categoryValue} onChange={(e) => setCategoryValue(e.target.value)} />
                  <div className="flex flex-wrap gap-2 pt-2">
                    {CATEGORY_SUGGESTIONS.map((item) => (
                      <SuggestionPill key={item} onClick={() => applyCategorySuggestion(item)}>{item}</SuggestionPill>
                    ))}
                  </div>
                </Field>
                <Field label="特性标签" htmlFor="tags" hint="多个标签用逗号分隔，越详细越好。">
                  <input id="tags" name="tags" placeholder="例如：免费试用, 文生图, API" className={inputClass} value={tagsValue} onChange={(e) => setTagsValue(e.target.value)} />
                  <div className="flex flex-wrap gap-2 pt-2">
                    {TAG_SUGGESTIONS.map((item) => (
                      <SuggestionPill key={item} onClick={() => applyTagSuggestion(item)}>{item}</SuggestionPill>
                    ))}
                  </div>
                </Field>
                <Field label="联系方式 (选填)" htmlFor="contact">
                  <input id="contact" name="contact" placeholder="邮箱或微信号，方便审核时沟通" className={inputClass} />
                </Field>
                <Field label="补充优势 (选填)" htmlFor="reason" hint="可以告诉我们这款产品与同类竞品最大的差异是什么。">
                  <textarea id="reason" name="reason" rows={3} placeholder="例如：支持超长上下文记忆、首月赠送额度等..." className={`${inputClass} resize-none`} />
                </Field>
              </div>
            </div>
          </div>

          {/* 👇 新增区块：长文本内容编辑区（跨越两列，占据全宽，保证书写体验） */}
          <div className="space-y-8 rounded-[24px] bg-zinc-50/50 p-6 sm:p-8 mt-8">
            <div className="space-y-1.5">
              <h2 className="text-[20px] font-bold tracking-tight text-zinc-900">详情与教程 (Markdown)</h2>
              <p className="text-[14px] leading-6 text-zinc-500">使用 Markdown 语法进行高级排版，这部分内容将展现在工具详情页中。</p>
            </div>
            
            <div className="grid gap-6">
              <Field label="产品简介 (Content)" htmlFor="content" hint="详细介绍该工具的功能特点。支持 # 标题、* 列表、**加粗** 等 Markdown 语法。">
                <textarea 
                  id="content" 
                  name="content" 
                  rows={8} 
                  value={contentValue}
                  onChange={(e) => setContentValue(e.target.value)}
                  placeholder="在这里输入产品长篇简介..." 
                  className={`${inputClass} font-mono text-[13px] resize-y`} 
                />
              </Field>

              <Field label="保姆级教程 (Tutorial)" htmlFor="tutorial" hint="带步骤的操作指南。内容会被渲染在你做好的 Tabs 组件中。">
                <textarea 
                  id="tutorial" 
                  name="tutorial" 
                  rows={12} 
                  value={tutorialValue}
                  onChange={(e) => setTutorialValue(e.target.value)}
                  placeholder="### 第一步：注册账号&#10;在这里输入教程..." 
                  className={`${inputClass} font-mono text-[13px] resize-y`} 
                />
              </Field>
            </div>
          </div>
          {/* 👆 新增区块结束 */}

          <div className="mt-8 border-t border-black/[0.04] pt-8 space-y-6">
            {msg && !submitted ? <Notice type={noticeType} message={msg} /> : null}

            {submitted ? (
              <div className="rounded-[28px] border border-black/[0.04] bg-[linear-gradient(180deg,rgba(250,250,250,0.8),rgba(244,244,245,0.4))] p-6 sm:p-8 animate-in zoom-in-95 duration-500">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="text-[20px] font-bold text-zinc-900">🎉 成功提交审核</div>
                  <p className="text-[15px] leading-relaxed text-zinc-600">{msg}</p>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-black/[0.03] bg-white px-5 py-4 text-[14px] leading-6 text-zinc-600 shadow-sm"><strong className="text-zinc-900 block mb-1">1. 联通性测试</strong>检查官网是否可正常访问，响应是否迅速。</div>
                  <div className="rounded-[20px] border border-black/[0.03] bg-white px-5 py-4 text-[14px] leading-6 text-zinc-600 shadow-sm"><strong className="text-zinc-900 block mb-1">2. 信息归档</strong>重新校验分类、标签，提取高清 Logo。</div>
                  <div className="rounded-[20px] border border-black/[0.03] bg-white px-5 py-4 text-[14px] leading-6 text-zinc-600 shadow-sm"><strong className="text-zinc-900 block mb-1">3. 正式上线</strong>通过审核后，获得全站资源位推荐与分发。</div>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <Link href="/featured" className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-8 py-3.5 text-[14px] font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]">去浏览精选目录</Link>
                  <Link href="/" className="inline-flex items-center justify-center rounded-full border border-black/[0.08] bg-white px-8 py-3.5 text-[14px] font-semibold text-zinc-700 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:border-black/[0.15] hover:bg-zinc-50 hover:text-zinc-950 active:scale-[0.98]">返回首页</Link>
                </div>
              </div>
            ) : null}

            {!submitted && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
                <button type="submit" disabled={loading || extracting} className="inline-flex items-center justify-center rounded-[18px] bg-zinc-900 px-8 py-4 text-[15px] font-semibold tracking-wide text-white transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_14px_30px_rgba(0,0,0,0.15)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-white/70" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      正在提交...
                    </span>
                  ) : "确认无误，提交收录"}
                </button>
                <p className="text-[13px] font-medium text-zinc-400">提交即代表您同意本站的收录规则与隐私条款。</p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}