// app/workspace/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Search, Image as ImageIcon, Wand2, ArrowRight, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "AI 灵感套件 | AI 工具目录",
  description: "一键开启你的专属 AI 效率工作台，包含全网搜索灵感、反向提示词与魔法扩写等原生工具。",
};

const WORKSPACE_TOOLS = [
  {
    title: "全网搜索灵感",
    desc: "打破信息茧房，AI 为你生成直达各平台的高效长尾搜索策略，支持 App 一键唤醒。",
    href: "/search-test",
    icon: <Search className="h-6 w-6 text-gray-700" />,
    badge: "HOT",
    color: "from-blue-50 to-white",
  },
  {
    title: "反向提示词",
    desc: "上传关键帧或参考图，逆向拆解可复用的完美 Prompt 提示词结构。",
    href: "/reverse-prompt",
    icon: <ImageIcon className="h-6 w-6 text-gray-700" />,
    badge: "NEW",
    color: "from-purple-50 to-white",
  },
  {
    title: "魔法扩写",
    desc: "输入简单的短句想法，一键智能扩充为结构化、细节丰富的专业提示词。",
    href: "/enhance-prompt",
    icon: <Wand2 className="h-6 w-6 text-gray-700" />,
    color: "from-emerald-50 to-white",
  },
];

export default function WorkspacePage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fafafa_0%,#f7f7f8_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* 头部标题区 */}
        <div className="mb-14 text-center space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1 text-[12px] font-medium tracking-[0.1em] text-gray-500 shadow-sm uppercase">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            Official Tools
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-5xl">
            AI 灵感套件
          </h1>
          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-gray-500 sm:text-base">
            这里是我们为你精心打造的专属原生 AI 工具箱。无需跳转第三方，在这里一站式完成搜索策略规划、提示词逆向拆解与灵感扩写。
          </p>
        </div>

        {/* 工具卡片网格 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 fill-mode-both">
          {WORKSPACE_TOOLS.map((tool, index) => (
            <Link
              key={index}
              href={tool.href}
              className="group relative flex flex-col justify-between overflow-hidden rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
            >
              {/* 卡片专属的极简氛围渐变背景 */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-40 transition-opacity duration-500 group-hover:opacity-100`} />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-black/5 bg-white shadow-sm transition-transform duration-500 group-hover:scale-110">
                    {tool.icon}
                  </div>
                  {tool.badge && (
                    <span className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] text-gray-900 uppercase">
                      {tool.badge}
                    </span>
                  )}
                </div>
                
                <h2 className="mb-2.5 text-xl font-bold tracking-tight text-gray-900">
                  {tool.title}
                </h2>
                <p className="text-[13px] leading-relaxed text-gray-500">
                  {tool.desc}
                </p>
              </div>

              <div className="relative z-10 mt-8 flex items-center text-[13px] font-semibold text-gray-900">
                立即使用 
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
        
      </div>
    </div>
  );
}