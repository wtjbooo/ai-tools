"use client";

import { useState } from "react";
import Link from "next/link";

type NoticeType = "success" | "error" | null;

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

  const isSuccess = type === "success";

  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3 text-sm leading-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        isSuccess
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-red-200 bg-red-50 text-red-800",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            isSuccess
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700",
          ].join(" ")}
        >
          {isSuccess ? "✓" : "!"}
        </div>

        <div className="min-w-0">
          <div className="font-medium">
            {isSuccess ? "提交成功" : "提交失败"}
          </div>
          <div>{message}</div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:shadow-[0_8px_24px_rgba(0,0,0,0.06)]";

export default function SubmitForm() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [noticeType, setNoticeType] = useState<NoticeType>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setNoticeType(null);
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
      } else {
        setMsg("我们会尽快审核并收录。你也可以稍后到站内搜索查看是否已上线。");
        setNoticeType("success");
        form.reset();
      }
    } catch (error) {
      console.error("submit form error:", error);
      setMsg("网络异常，请稍后重试。");
      setNoticeType("error");
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
            <Field label="工具名称" htmlFor="name">
              <input
                id="name"
                name="name"
                placeholder="例如：ChatGPT"
                className={inputClass}
                required
              />
            </Field>

            <Field label="官网链接" htmlFor="website">
              <input
                id="website"
                name="website"
                type="url"
                placeholder="https://example.com"
                className={inputClass}
                required
              />
            </Field>

            <Field label="一句话简介" htmlFor="description">
              <input
                id="description"
                name="description"
                placeholder="例如：OpenAI 推出的 AI 对话助手"
                className={inputClass}
                required
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
              />
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
              />
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "提交中..." : "提交收录"}
              </button>

              {!msg ? (
                <p className="text-sm leading-6 text-gray-500">
                  提交前请确认官网可访问，分类只填写一个主分类。
                </p>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}