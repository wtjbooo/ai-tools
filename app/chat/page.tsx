// @ts-nocheck
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (日常/极速)' },
  { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (逻辑/代码)' },
  { id: 'deepseek-chat', name: 'DeepSeek V3 (官方)' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1 (官方思考)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (官方免费新版)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (中转长文本)' },
  { id: 'gpt-4o', name: 'GPT-4o (复杂任务)' },
  { id: 'LongCat-Flash-Thinking-2601', name: 'LongCat (长文本特化)' }, 
];

export default function ChatPage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentModel, setCurrentModel] = useState<string>(MODELS[0].id);
  
  const [messages, setMessages] = useState([]);
  const [myInput, setMyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollContainerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('鉴权失败:', error);
        router.push('/login');
      } finally {
        setIsAuthChecking(false);
      }
    };
    verifyUser();
  }, [router]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myInput.trim() || isLoading) return;
    
    const userText = myInput.trim();
    setMyInput(''); 
    setIsLoading(true);

    const newUserMessage = { id: Date.now().toString(), role: 'user', content: userText };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          model: currentModel,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `后端请求失败 (状态码: ${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const lastIdx = prev.length - 1;
            const updatedLast = { ...prev[lastIdx], content: prev[lastIdx].content + chunk };
            return [...prev.slice(0, lastIdx), updatedLast];
          });
        }
      }
    } catch (error) {
      console.error('发送错误:', error);
      setMessages((prev) => {
        const lastIdx = prev.length - 1;
        const updatedLast = { ...prev[lastIdx], content: prev[lastIdx].content + `\n\n[⚠️ ${error.message}]` };
        return [...prev.slice(0, lastIdx), updatedLast];
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#050507]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-10 w-10 items-center justify-center">
             <div className="absolute h-full w-full animate-ping rounded-full bg-cyan-500/20"></div>
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400"></div>
          </div>
          <p className="text-sm font-medium tracking-widest text-cyan-400/80 uppercase">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050507] text-gray-100 font-sans overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-50">
      
      {/* 🔮 赛博朋克氛围光晕 (Cyberpunk Glow) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>

      <div className="mx-auto max-w-5xl px-4 py-6 h-screen flex flex-col relative z-10">
        {/* 🍏 主容器：Apple 极致毛玻璃质感 */}
        <div className="flex flex-col h-full bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.4)] border border-white/[0.05] overflow-hidden">
          
          {/* --- 顶部 Header --- */}
          <header className="flex items-center justify-between px-8 py-5 bg-black/20 backdrop-blur-md border-b border-white/[0.05] z-10">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-black/50 border border-white/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
              </div>
              <h1 className="text-lg font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
                XAira <span className="text-cyan-400/80 font-mono text-sm ml-1 opacity-80 border border-cyan-500/30 rounded-md px-1.5 py-0.5">OS</span>
              </h1>
            </div>
            
            <div className="relative group">
              <select
                value={currentModel}
                onChange={(e) => setCurrentModel(e.target.value)}
                className="pl-4 pr-10 py-2 bg-black/40 hover:bg-black/60 text-gray-300 text-sm font-medium rounded-2xl border border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer outline-none appearance-none shadow-sm"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.6rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em` }}
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-gray-900 text-gray-200">{m.name}</option>
                ))}
              </select>
            </div>
          </header>

          {/* --- 聊天记录展示区 --- */}
          <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth custom-scrollbar">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-gray-500">
                <div className="relative h-20 w-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/10 animate-[spin_10s_linear_infinite]"></div>
                  <svg className="w-8 h-8 text-cyan-500/70 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="font-mono text-sm tracking-widest uppercase opacity-60">System Ready. Awaiting Input.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div
                    className={`max-w-[85%] md:max-w-[75%] px-6 py-4 text-[15px] leading-relaxed shadow-lg min-w-0 ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-cyan-600/90 to-blue-700/90 text-white rounded-[2rem] rounded-tr-sm shadow-[0_4px_20px_rgba(6,182,212,0.15)] border border-white/10 backdrop-blur-md' 
                        : 'bg-white/[0.04] text-gray-200 rounded-[2rem] rounded-tl-sm border border-white/[0.08] backdrop-blur-xl' 
                    }`}
                  >
                    {m.role === 'user' ? (
                      <pre className="whitespace-pre-wrap font-sans m-0 text-inherit">{m.content}</pre>
                    ) : (
                      <ReactMarkdown
                        className="prose prose-invert prose-sm md:prose-base max-w-none text-gray-300 break-words prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-code:text-cyan-300 prose-code:bg-cyan-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none"
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="rounded-xl overflow-hidden my-6 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] bg-[#1e1e1e]">
                                <div className="flex items-center px-4 py-2.5 bg-black/40 text-gray-400 text-xs font-mono border-b border-white/5">
                                  <div className="flex gap-1.5 mr-4">
                                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
                                  </div>
                                  <span className="uppercase tracking-widest opacity-70">{match[1]}</span>
                                </div>
                                <SyntaxHighlighter
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{ margin: 0, padding: '1.25rem', background: 'transparent', fontSize: '0.875rem' }}
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {/* AI 思考/输入加载状态 (赛博风打字机) */}
            {isLoading && messages.length > 0 && messages[messages.length - 1].content === '' && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="bg-white/[0.04] px-6 py-5 rounded-[2rem] rounded-tl-sm border border-white/[0.08] backdrop-blur-xl flex items-center gap-2 shadow-lg">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* --- 底部输入区 (Apple Floating Dock) --- */}
          <footer className="px-6 py-6 pb-8">
            <form
              onSubmit={handleSend}
              className="flex items-center relative max-w-4xl mx-auto bg-black/40 backdrop-blur-2xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-white/10 focus-within:border-cyan-500/40 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 p-2"
            >
              <input
                className="flex-1 bg-transparent px-6 py-3 text-[15px] text-gray-100 placeholder-gray-500 outline-none w-full font-medium"
                value={myInput}
                onChange={(e) => setMyInput(e.target.value)}
                placeholder="Initialize protocol..."
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !myInput.trim()}
                className="ml-2 flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] hover:scale-105 disabled:opacity-30 disabled:scale-100 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300 shrink-0"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 relative right-[1px] transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </form>
            <div className="text-center mt-4">
              <span className="text-[10px] uppercase tracking-widest text-gray-500/70 font-mono">
                AI may generate inaccurate information. Verify critical data.
              </span>
            </div>
          </footer>
        </div>
      </div>

      {/* 自定义滚动条样式，可放入 global.css 中，这里以注入方式实现兼容 */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(6, 182, 212, 0.5);
        }
      `}</style>
    </div>
  );
}