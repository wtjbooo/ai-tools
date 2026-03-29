"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

type NoticeType = "success" | "error" | "info" | null;

const CATEGORY_SUGGESTIONS = [
  "聊天助手",
  "图像生成",
  "视频生成",
  "写作助手",
  "搜索问答",
  "编程开发",
  "办公效率",
  "翻译工具",
  "语音工具",
  "PPT 生成",
];

const TAG_SUGGESTIONS = [
  "免费试用",
  "中文支持",
  "多模型",
  "API",
  "文生图",
  "视频编辑",
  "团队协作",
  "效率工具",
  "内容创作",
  "办公自动化",
];

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

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-900"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-6 text-gray-500">{hint}</p> : null}
    </div>
  );
}

function Notice({
  type,
  message,
}: {
  type: NoticeType;
  message: string;
}) {
  if (!type) return null;

  const styles =
    type === "success"
      ? {
          box: "border-green-200 bg-green-50/90 text-green-800",
          icon: "bg-green-100 text-green-700",
          title: "已完成",
          symbol: "✓",
        }
      : type === "info"
      ? {
          box: "border-blue-200 bg-blue-50/90 text-blue-800",
          icon: "bg-blue-100 text-blue-700",
          title: "提示",
          symbol: "i",
        }
      : {
          box: "border-red-200 bg-red-50/90 text-red-800",
          icon: "bg-red-100 text-red-700",
          title: "请检查",
          symbol: "!",
        };

  return (
    <div
      className={[
        "rounded-[20px] border px-4 py-4 text-sm leading-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        styles.box,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            styles.icon,
          ].join(" ")}
        >
          {styles.symbol}
        </div>

        <div className="min-w-0">
          <div className="font-medium">{styles.title}</div>
          <div>{message}</div>
        </div>
      </div>
    </div>
  );
}

function SuggestionPill({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-black/12 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function IntroPill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-black/8 bg-white/78 px-3.5 py-2 text-sm text-gray-700">
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-[20px] border border-black/10 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-black/20 focus:bg-white focus:shadow-[0_10px_24px_rgba(15,23,42,0.06)]";

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

  function applyCategorySuggestion(value: string) {
    setCategoryValue(value);
  }

  function applyTagSuggestion(value: string) {
    const current = tagsValue.trim();

    if (!current) {
      setTagsValue(value);
      return;
    }

    const parts = current
      .split(/,|，/)
      .map((item) => normalizeSpaces(item))
      .filter(Boolean);

    if (parts.includes(value)) {
      return;
    }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ website }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setMsg(
          data?.error ?? "未能自动获取网站信息，你仍然可以手动填写后提交。"
        );
        setNoticeType("info");
        return;
      }

      const extractedName = String(data?.data?.name ?? "").trim();
      const extractedDescription = String(data?.data?.description ?? "").trim();

      let filledCount = 0;

      if (extractedName && !nameValue.trim()) {
        setNameValue(extractedName);
        filledCount += 1;
      }

      if (extractedDescription && !descriptionValue.trim()) {
        setDescriptionValue(extractedDescription);
        filledCount += 1;
      }

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
        setMsg(
          "我们已经收到你的工具提交，并已进入审核队列。通常会在 1 到 3 天内完成审核。"
        );
        setNoticeType("success");
        setSubmitted(true);
        form.reset();
        setNameValue("");
        setWebsiteValue("");
        setDescriptionValue("");
        setCategoryValue("");
        setTagsValue("");
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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="space-y-6 sm:space-y-8">
        <section className="relative overflow-hidden rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] px-6 py-8 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.10),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.08),transparent_26%)]" />

          <div className="relative max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-black/10 bg-white/88 px-3.5 py-2 text-sm text-gray-700 transition hover:-translate-y-0.5 hover:border-black/15 hover:text-gray-950"
              >
                ← 返回首页
              </Link>

              <span className="inline-flex items-center rounded-full border border-black/8 bg-white/78 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-gray-500">
                SUBMIT AI TOOL
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-[48px] sm:leading-[1.04]">
                提交你的 AI 工具
              </h1>

              <p className="max-w-2xl text-sm leading-7 text-gray-600 sm:text-[15px]">
                填写官网、简介与分类信息，我们会在审核后决定是否收录进目录。
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <IntroPill>支持自动获取网站信息</IntroPill>
              <IntroPill>只填写一个主分类</IntroPill>
              <IntroPill>通常 1～3 天审核</IntroPill>
            </div>
          </div>
        </section>

        <form
          onSubmit={onSubmit}
          className="rounded-[28px] border border-black/8 bg-white/94 p-5 shadow-[0_10px_32px_rgba(15,23,42,0.05)] sm:p-6"
        >
          <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-[22px] font-semibold tracking-tight text-gray-950">
                  基础信息
                </h2>
                <p className="text-sm leading-6 text-gray-500">
                  先填写官网、名称与一句话简介。
                </p>
              </div>

              <Field
                label="官网链接"
                htmlFor="website"
                hint="建议优先填写官网链接，通常可以自动补全名称和简介。"
              >
                <div className="space-y-3">
                  <input
                    id="website"
                    name="website"
                    type="url"
                    placeholder="https://example.com"
                    className={inputClass}
                    required
                    value={websiteValue}
                    onChange={(e) => setWebsiteValue(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={handleExtractWebsiteInfo}
                    disabled={extracting || loading}
                    className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-black/15 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {extracting ? "自动获取中..." : "自动获取网站信息"}
                  </button>
                </div>
              </Field>

              <Field label="工具名称" htmlFor="name">
                <input
                  id="name"
                  name="name"
                  placeholder="例如：ChatGPT"
                  className={inputClass}
                  required
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                />
              </Field>

              <Field label="一句话简介" htmlFor="description">
                <input
                  id="description"
                  name="description"
                  placeholder="例如：OpenAI 推出的 AI 对话助手"
                  className={inputClass}
                  required
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                />
              </Field>
            </div>

            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-[22px] font-semibold tracking-tight text-gray-950">
                  分类与补充
                </h2>
                <p className="text-sm leading-6 text-gray-500">
                  用更少但更准确的信息，帮助我们更快判断是否收录。
                </p>
              </div>

              <Field
                label="分类"
                htmlFor="category"
                hint="只填写一个主分类，例如：聊天助手、图像生成、视频生成、知识检索"
              >
                <input
                  id="category"
                  name="category"
                  placeholder="例如：聊天助手"
                  className={inputClass}
                  required
                  value={categoryValue}
                  onChange={(e) => setCategoryValue(e.target.value)}
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {CATEGORY_SUGGESTIONS.map((item) => (
                    <SuggestionPill
                      key={item}
                      onClick={() => applyCategorySuggestion(item)}
                    >
                      {item}
                    </SuggestionPill>
                  ))}
                </div>
              </Field>

              <Field
                label="标签"
                htmlFor="tags"
                hint="多个标签可用英文逗号或中文逗号分隔"
              >
                <input
                  id="tags"
                  name="tags"
                  placeholder="例如：免费试用, 文生图, 办公效率"
                  className={inputClass}
                  value={tagsValue}
                  onChange={(e) => setTagsValue(e.target.value)}
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {TAG_SUGGESTIONS.map((item) => (
                    <SuggestionPill
                      key={item}
                      onClick={() => applyTagSuggestion(item)}
                    >
                      {item}
                    </SuggestionPill>
                  ))}
                </div>
              </Field>

              <Field label="联系方式" htmlFor="contact">
                <input
                  id="contact"
                  name="contact"
                  placeholder="邮箱、微信或其他联系方式"
                  className={inputClass}
                />
              </Field>

              <Field
                label="补充说明"
                htmlFor="reason"
                hint="可补充适合人群、价格模式、核心功能或与同类工具的差异。"
              >
                <textarea
                  id="reason"
                  name="reason"
                  rows={6}
                  placeholder="例如：支持多模型切换、适合内容创作者、提供免费额度等"
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 border-t border-black/8 pt-5 space-y-4">
            {msg && !submitted ? (
              <Notice type={noticeType} message={msg} />
            ) : null}

            {submitted ? (
              <div className="rounded-[22px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 sm:p-5">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-950">
                    已进入审核队列
                  </div>
                  <p className="text-sm leading-6 text-gray-600">{msg}</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-black/8 bg-white px-4 py-3 text-sm leading-6 text-gray-700">
                    检查官网是否可访问，信息是否完整。
                  </div>
                  <div className="rounded-[18px] border border-black/8 bg-white px-4 py-3 text-sm leading-6 text-gray-700">
                    判断分类、标签与目录定位是否匹配。
                  </div>
                  <div className="rounded-[18px] border border-black/8 bg-white px-4 py-3 text-sm leading-6 text-gray-700">
                    通过后会进入站内展示与分类收录。
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/featured"
                    className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
                  >
                    去看精选推荐
                  </Link>

                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-black/15 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
                  >
                    返回首页
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={loading || extracting}
                className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "提交中..." : "提交收录"}
              </button>

              {!msg ? (
                <p className="text-sm leading-6 text-gray-500">
                  提交前尽量确认官网可访问、简介清晰、分类准确。
                </p>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}