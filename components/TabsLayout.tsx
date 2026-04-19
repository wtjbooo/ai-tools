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
            保姆级教程 ✨
            {activeTab === "tutorial" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-t-full" />
            )}
          </button>
        </div>
      )}

      <div className="min-h-[200px]">
        {activeTab === "intro" && (
          <div className="prose prose-zinc max-w-none text-[15px] leading-loose animate-in fade-in duration-500 prose-headings:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-500">
            <ReactMarkdown>{contentParagraphs.join("\n\n")}</ReactMarkdown>
          </div>
        )}

        {activeTab === "tutorial" && hasTutorial && (
          <div className="prose prose-zinc max-w-none text-[15px] leading-loose animate-in fade-in duration-500 prose-headings:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-500">
            <ReactMarkdown>{tutorialContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}