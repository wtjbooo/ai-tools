"use client";

import { useState } from "react";
import Link from "next/link";

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
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-900">
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
          box: "border-green-200 bg-green-50 text-green-800",
          icon: "bg-green-100 text-green-700",
          title: "提交成功",
          symbol: "✓",
        }
      : type === "info"
      ? {
          box: "border-blue-200 bg-blue-50 text-blue-800",
          icon: "bg-blue-100 text-blue-700",
          title: "自动获取提示",
          symbol: "i",
        }
      : {
          box: "border-red-200 bg-red-50 text-red-800",
          icon: "bg-red-100 text-red-700",
          title: "操作提示",
          symbol: "!",
        };

  return (
    <div
      className={[
        "rounded-2xl border px-4 py-4 text-sm leading-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
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
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:shadow-[0_8px_24px_rgba(0,0,0,0.06)]";

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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
          "我们已经收到你的工具提交，并已进入审核队列。通常会在 1 到 3 天内完成审核；如果未通过，后续也可以重新提交。"
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="space-y-6 sm:space-y-8">
        <section className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white px-5 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:rounded-[32px] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.06),transparent_30%)]" />

          <div className="relative space-y-4">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:text-gray-950 active:scale-[0.98]"
            >
              ← 返回首页
            </Link>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                提交你的 AI 工具
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
                欢迎提交优质的 AI 工具。请尽量填写完整信息，方便我们更快审核和收录。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[22px] border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:rounded-[24px] sm:p-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-gray-950">
              收录说明
            </h2>
            <div className="space-y-2 text-sm leading-7 text-gray-700">
              <p>1. 一般会在 1 到 3 天内完成审核。</p>
              <p>2. 仅收录可正常访问、内容清晰、用途明确的 AI 工具或相关产品。</p>
              <p>3. 不收录违法违规、长期失效、内容空白或明显低质量的网站。</p>
              <p>4. 如果信息不完整，可能不会通过审核。</p>
              <p>5. 分类只填写一个主分类，不要填写“聊天助手 / 视频生成”这种组合值。</p>
            </div>
          </div>
        </section>

        <form
          onSubmit={onSubmit}
          className="rounded-[22px] border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:rounded-[24px] sm:p-6"
        >
          <div className="grid gap-5">
            <Field label="官网链接" htmlFor="website">
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
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
              hint="可以补充工具特点、适合人群、价格模式、核心功能等信息"
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

          <div className="mt-6 space-y-4">
            {msg ? <Notice type={noticeType} message={msg} /> : null}

            {submitted ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                <div className="font-medium text-gray-900">接下来会发生什么？</div>
                <div className="mt-2 space-y-1 leading-6">
                  <p>• 我们会检查官网是否可访问、信息是否完整、分类是否合理。</p>
                  <p>• 如果审核通过，工具会进入站内展示，并可被搜索与分类页收录。</p>
                  <p>• 如果这次没有通过，后续仍然可以重新提交。</p>
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
                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
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
                  支持先填写官网链接，再自动获取名称和简介。
                </p>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}