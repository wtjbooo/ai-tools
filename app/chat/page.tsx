"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useUpgradeModal } from "@/contexts/UpgradeModalContext";

const AI_MODELS = [
  { id: "gpt-3.5-turbo", name: "GPT-3.5 (基础版)" },
  { id: "gpt-4o", name: "GPT-4o (旗舰版)" },
  { id: "claude-3-5-sonnet-20240620", name: "Claude-sonnet-4-6 (代码强)" },
  { id: "deepseek-chat", name: "DeepSeek V3 (官方)" },
  { id: "deepseek-reasoner", name: "DeepSeek R1 (深度思考)" },
  { id: "gemini-1.5-pro", name: "Gemini 2.5 Pro (官方)" },
  { id: "LongCat-Flash-Thinking-2601", name: "LongCat-Flash-Thinking (官方)" }
];

export default function ChatPage() {
  const { openModal } = useUpgradeModal();
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const userData = data.user || data; 
        if (userData && (userData.id || userData.email || userData.name || userData.userId)) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  // 💡 【真正的物理隔离】：先把所有参数放到一个独立变量里，并声明为 any
  const chatOptions: any = {
    api: "/api/chat",
    body: { model: selectedModel },
    onResponse: (response: any) => {
      if (response.status === 402) openModal(true); 
      if (response.status === 401) {
        alert("登录已过期，请点击右上角重新登录！");
        setIsLoggedIn(false);
      }
    },
    onError: (error: any) => {
      alert("发送失败: " + error.message);
    }
  };

  // 💡 TypeScript 面对一个已经定义好的 any 变量，绝对不可能再去检查它的属性
  const chatHookResult: any = useChat(chatOptions);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = chatHookResult;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const safeInput = typeof input === "string" ? input : "";

  return (
    <div className="w-full h-[calc(100vh-70px)] bg-gray-50 font-sans flex flex-col items-center">
      
      <header className="w-full max-w-3xl bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex justify-between items-center z-10 sticky top-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">XAira 智能助手</h1>
          <p className="text-sm text-gray-500 mt-0.5">正在与最新的 AI 大模型对话</p>
        </div>
        
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={isLoading}
          className="border border-gray-200 rounded-lg px-4 py-2 bg-white text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer"
        >
          {AI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </header>

      <main className="flex-1 w-full max-w-3xl overflow-y-auto px-4 py-6 scrollbar-hide">
        {messages?.length === 0 ? (
          <div className="text-center text-gray-400 mt-24 flex flex-col items-center gap-3">
             <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-2xl">✨</div>
             <p className="text-[15px]">你好！我是 XAira 智能助手，今天想聊点什么？</p>
          </div>
        ) : (
          messages?.map((m: any) => (
            <div key={m.id} className={`mb-6 flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role !== "user" && (
                <div className="w-8 h-8 rounded-full border border-gray-100 bg-white flex items-center justify-center text-xs font-bold text-blue-600 shadow-sm mt-0.5">
                  Ai
                </div>
              )}
              <div className={`px-5 py-3 rounded-2xl max-w-[80%] shadow-sm leading-relaxed ${
                m.role === "user" 
                  ? "bg-blue-600 text-white rounded-br-sm" 
                  : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm" 
              }`}>
                <div className="whitespace-pre-wrap text-[14.5px]">{m.content}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="w-full max-w-3xl px-4 pt-2 pb-16 z-20">
        {isLoggedIn === null ? (
          <div className="text-center text-gray-400 text-sm">正在验证身份...</div>
        ) : !isLoggedIn ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm flex flex-col items-center">
             <p className="text-gray-600 text-[14.5px] font-medium">请先登录，开启与 AI 的对话</p>
             <p className="text-xs text-gray-400 mt-1">点击页面右上角的【登录】按钮即可</p>
          </div>
        ) : (
          <form 
            onSubmit={handleSubmit}
            className="relative flex items-end w-full bg-white border border-gray-200 rounded-[28px] shadow-sm transition-all focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-200"
          >
            <textarea
              className="w-full bg-transparent rounded-[28px] pl-6 pr-16 py-5 text-[15px] font-medium text-gray-800 focus:outline-none resize-none min-h-[72px] max-h-[200px] placeholder-gray-400 scrollbar-hide leading-relaxed"
              value={safeInput}
              placeholder="输入你的问题... (按 Enter 发送)"
              onChange={handleInputChange}
              disabled={isLoading}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault(); 
                  if (safeInput.trim() && !isLoading) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !safeInput.trim()}
              className="absolute right-3 bottom-3.5 bg-blue-600 text-white w-11 h-11 rounded-full font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center text-xl z-10"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
              ) : (
                <span>↑</span>
              )}
            </button>
          </form>
        )}
      </footer>
    </div>
  );
}