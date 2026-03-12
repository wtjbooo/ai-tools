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
        "flex flex-col gap-2.5 sm:flex-row sm:items-center",
        "rounded-[22px] border border-gray-200 bg-white px-2.5 py-2.5",
        "transition-all duration-300",
        isFocused
          ? "border-gray-300 shadow-[0_12px_30px_rgba(0,0,0,0.07)]"
          : "shadow-[0_6px_18px_rgba(0,0,0,0.035)]",
      ].join(" ")}
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (!query) return;
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[16px] bg-gray-50 px-4 py-2.5 transition-colors duration-300 focus-within:bg-white">
        <div className="shrink-0 text-gray-400 transition-colors duration-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-[18px] w-[18px]"
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
          className="h-10 w-full bg-transparent text-[15px] leading-10 text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>

      <button
        type="submit"
        className={[
          "inline-flex h-[44px] shrink-0 items-center justify-center rounded-[16px]",
          "border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700",
          "transition-all duration-200",
          "hover:-translate-y-0.5 hover:border-gray-300 hover:text-gray-950 hover:shadow-[0_8px_18px_rgba(0,0,0,0.06)]",
          "active:scale-[0.98]",
        ].join(" ")}
      >
        搜索
      </button>
    </form>
  );
}