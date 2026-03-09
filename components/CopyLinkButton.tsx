"use client";

import { useEffect, useState } from "react";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (error) {
      console.error("copy link failed:", error);
      setCopied(false);
    }
  }

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={[
        "inline-flex items-center rounded-full border px-5 py-3 text-sm transition-all duration-200 active:scale-[0.98]",
        copied
          ? "border-gray-900 bg-gray-900 text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
          : "border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950",
      ].join(" ")}
    >
      {copied ? "已复制链接" : "复制链接"}
    </button>
  );
}