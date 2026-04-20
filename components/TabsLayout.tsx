"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function TabsLayout({
  contentParagraphs,
  tutorialContent,
  toolId,
}: {
  contentParagraphs: string[];
  tutorialContent?: string | null;
  toolId: string;
}) {
  const [activeTab, setActiveTab] = useState<"intro" | "tutorial">("intro");
  const hasTutorial = tutorialContent && tutorialContent.trim() !== "";

  // 🚀 核心大招：自定义强力排版器，绝对 100% 生效！
  const markdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold mt-8 mb-4 text-zinc-900" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl font-bold mt-8 mb-4 text-zinc-900" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-[17px] font-bold mt-6 mb-3 text-zinc-900" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-4 text-[15px] leading-7 text-zinc-600" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-6 mb-4 space-y-2 text-[15px] text-zinc-600 marker:text-zinc-400" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-[15px] text-zinc-600 marker:text-zinc-400" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-semibold text-zinc-900" {...props} />,
    a: ({node, ...props}: any) => <a className="text-blue-600 hover:text-blue-700 hover:underline underline-offset-4" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-zinc-200 pl-4 py-1 my-4 italic text-zinc-500 bg-zinc-50/50 rounded-r-lg" {...props} />,
    // 👇 新增：Markdown 里的图片自动变成带大圆角和阴影的高级卡片，鼠标悬浮还会微微放大 👇
    img: ({ node, ...props }: any) => (
      <img
        {...props}
        className="my-8 max-w-full rounded-[20px] border border-black/[0.04] shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-transform duration-500 hover:scale-[1.02]"
        loading="lazy"
      />
    ),
    // 👆 新增结束 👆
  };

  return (
    <div className="space-y-6">
      {hasTutorial && (
        <div className="flex items-center gap-2 border-b border-black/[0.04] pb-px">
          <button
            onClick={() => setActiveTab("intro")}
            className={`relative pb-3 px-1 text-[16px] font-medium transition-colors ${
              activeTab === "intro" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            产品简介
            {activeTab === "intro" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-t-full" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("tutorial")}
            className={`relative pb-3 px-4 text-[16px] font-medium transition-colors ${
              activeTab === "tutorial" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            使用指南 💡
            {activeTab === "tutorial" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-t-full" />
            )}
          </button>
        </div>
      )}

      <div className="min-h-[200px] animate-in fade-in duration-500">
        {activeTab === "intro" && (
          <div className="max-w-none">
            <ReactMarkdown components={markdownComponents}>
              {contentParagraphs.join('\n\n')}
            </ReactMarkdown>
          </div>
        )}

        {activeTab === "tutorial" && hasTutorial && (
          <div className="max-w-none">
            <ReactMarkdown components={markdownComponents}>
              {tutorialContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}