"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HistoryItem = {
  taskId: string;
  fileCount: number;
  firstFileName: string;
  createdAt: number;
};

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const time = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return `今天 ${time}`;
  }

  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

export default function ReversePromptHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem("rp_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // 忽略解析错误
    }
  }, []);

  function handleClear() {
    if (window.confirm("确定要清空本地历史记录吗？")) {
      localStorage.removeItem("rp_history");
      setHistory([]);
    }
  }

  // 避免 SSR 渲染不一致
  if (!isMounted) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="space-y-6 sm:space-y-8">
        <section className="relative overflow-hidden rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] px-6 py-8 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.10),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.08),transparent_26%)]" />

          <div className="relative max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/reverse-prompt"
                className="inline-flex items-center rounded-full border border-black/10 bg-white/88 px-3.5 py-2 text-sm text-gray-700 transition hover:-translate-y-0.5 hover:border-black/15 hover:text-gray-950"
              >
                ← 返回工具
              </Link>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-[40px] sm:leading-[1.04]">
                History
              </h1>
              <p className="max-w-xl text-sm leading-7 text-gray-600 sm:text-[15px]">
                你最近在本设备生成的反推记录。记录仅保存在本地缓存中，清除浏览器数据后将失效。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-black/8 bg-white/92 p-5 shadow-[0_10px_32px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-[19px] font-semibold tracking-tight text-gray-950">
              最近记录
            </h2>
            {history.length > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-gray-500 transition hover:text-red-600"
              >
                清空列表
              </button>
            ) : null}
          </div>

          {history.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-[20px] border border-dashed border-black/10 bg-gray-50/50 py-10 text-center">
              <div className="text-sm font-medium text-gray-900">暂无历史记录</div>
              <div className="mt-1.5 text-xs text-gray-500">
                去上传关键帧，分析结果会自动保存在这里
              </div>
              <Link
                href="/reverse-prompt"
                className="mt-5 inline-flex items-center rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                去分析
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <Link
                  key={item.taskId}
                  href={`/reverse-prompt?task=${item.taskId}`}
                  className="group flex items-center justify-between rounded-[20px] border border-transparent bg-transparent px-4 py-3.5 transition hover:border-black/8 hover:bg-gray-50/80 sm:px-5"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">
                      {item.firstFileName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatDate(item.createdAt)}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-300" />
                      <span>{item.fileCount} 张关键帧</span>
                    </div>
                  </div>

                  <div className="shrink-0 pl-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-gray-400 transition group-hover:border-black/20 group-hover:text-black">
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}