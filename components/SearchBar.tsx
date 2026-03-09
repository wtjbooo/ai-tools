"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({
  defaultValue = "",
}: {
  defaultValue?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <form
      className={[
        "flex flex-col gap-3 sm:flex-row sm:items-center",
        "rounded-[24px] border border-gray-200 bg-white px-3 py-3",
        "transition-all duration-300",
        isFocused
          ? "border-gray-300 shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
          : "shadow-[0_8px_24px_rgba(0,0,0,0.04)]",
      ].join(" ")}
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (!query) return;
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[18px] bg-gray-50 px-4 py-3 transition-colors duration-300 focus-within:bg-white">
        <div className="shrink-0 text-gray-400 transition-colors duration-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="搜索 AI 工具（如：聊天、写作、PPT、图片）"
          className="w-full bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>

      <button
        type="submit"
        className={[
          "inline-flex h-[50px] shrink-0 items-center justify-center rounded-[18px]",
          "border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700",
          "transition-all duration-200",
          "hover:-translate-y-0.5 hover:border-gray-300 hover:text-gray-950 hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]",
          "active:scale-[0.98]",
        ].join(" ")}
      >
        搜索
      </button>
    </form>
  );
}