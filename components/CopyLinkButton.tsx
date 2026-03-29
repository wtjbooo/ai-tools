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
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={[
        "inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm transition-all duration-200 active:scale-[0.98]",
        copied
          ? "border-black/12 bg-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
          : "border-black/10 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-black/15 hover:bg-gray-50 hover:text-gray-950",
      ].join(" ")}
    >
      {copied ? "已复制" : "复制链接"}
    </button>
  );
}