"use client";

import { useState } from "react";

type Props = {
  email: string;
};

export default function BusinessContactActions({ email }: Props) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"" | "opening" | "fallback">("");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setStatus("");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setStatus("fallback");
      window.alert(`复制失败，请手动复制邮箱：${email}`);
    }
  }

  function handleMailto() {
    setStatus("opening");

    const subject = encodeURIComponent("商务合作咨询");
    const body = encodeURIComponent(
      [
        "你好，",
        "",
        "我想咨询 AI 工具目录的商务合作。",
        "",
        "公司 / 团队名称：",
        "产品名称：",
        "官网链接：",
        "合作方向：",
        "补充说明：",
      ].join("\n")
    );

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

    window.setTimeout(() => {
      setStatus("fallback");
    }, 1200);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleMailto}
          className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
        >
          邮件联系合作
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-black/12 hover:bg-white hover:text-gray-950 active:scale-[0.98]"
        >
          {copied ? "已复制邮箱" : "复制邮箱"}
        </button>
      </div>

      <div className="text-center">
        {status === "opening" ? (
          <p className="text-xs text-gray-500 sm:text-sm">
            正在尝试打开你的邮件客户端…
          </p>
        ) : null}

        {status === "fallback" ? (
          <p className="text-xs text-gray-500 sm:text-sm">
            如果没有自动打开邮件应用，可能是当前设备未配置默认邮箱客户端。你可以直接复制邮箱：
            <span className="font-medium text-gray-800"> {email}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}