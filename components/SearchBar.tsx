"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (!query) return;
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索 AI 工具（如：聊天、写作、PPT、图片）"
        className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2"
      />
      <button
        type="submit"
        className="rounded-xl border px-4 py-2 hover:shadow-sm"
      >
        搜索
      </button>
    </form>
  );
}