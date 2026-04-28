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

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const scrollContainerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050507]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-10 w-10 items-center justify-center">
             <div className="absolute h-full w-full animate-ping rounded-full bg-cyan-500/20"></div>
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400"></div>
          </div>
          <p className="text-sm font-medium tracking-widest text-cyan-400/80">正在验证身份...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#050507] text-gray-100 font-sans overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-50">
      
      {/* 🔮 背景特效组：网格底纹 + 赛博光晕 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>

      {/* 🚀 左侧装饰文字 (大屏可见) */}
      <div className="hidden xl:flex fixed left-6 top-0 bottom-0 flex-col justify-center opacity-[0.15] pointer-events-none select-none z-0">
        <span className="font-mono text-[10px] tracking-[0.4em] text-cyan-400" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          XAIRA NEURAL NETWORK /// SYS.OP.NORMAL
        </span>
      </div>

      {/* 🚀 右侧装饰文字 (大屏可见) */}
      <div className="hidden xl:flex fixed right-6 top-0 bottom-0 flex-col justify-center opacity-[0.15] pointer-events-none select-none z-0">
        <span className="font-mono text-[10px] tracking-[0.4em] text-purple-400" style={{ writingMode: 'vertical-rl' }}>
          DATA STREAM ENCRYPTED /// PORT 3000
        </span>
      </div>

      {/* 🍏 主容器：加宽到 max-w-6xl */}
      <div className="mx-auto max-w-6xl w-full px-2 sm:px-4 py-4 md:py-6 h-full flex flex-col relative z-10">
        <div className="flex flex-col h-full bg-[#0d0d12]/60 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.6)] border border-white/[0.05] overflow-hidden">
          
          {/* --- 顶部 Header --- */}
          <header className="flex items-center justify-between px-6 md:px-8 py-5 bg-transparent border-b border-white/[0.02] z-30">
            <div className="flex items-center gap-4 md:gap-6">
              <button 
                onClick={() => router.push('/')}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
                title="返回首页"
              >
                <svg className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-black/50 border border-white/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] hidden md:flex">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                </div>
                <h1 className="text-base md:text-lg font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
                  XAira <span className="text-cyan-400/80 font-mono text-xs md:text-sm ml-1 opacity-80 border border-cyan-500/30 rounded-md px-1.5 py-0.5">OS</span>
                </h1>
              </div>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 md:gap-3 pl-4 pr-3 py-2 bg-black/30 hover:bg-black/50 text-gray-300 text-xs md:text-sm font-medium rounded-2xl border border-white/[0.08] hover:border-cyan-500/40 transition-all shadow-sm focus:outline-none max-w-[150px] md:max-w-none truncate"
              >
                <span className="truncate">{MODELS.find(m => m.id === currentModel)?.name}</span>
                <svg 
                  className={`w-3 h-3 md:w-4 md:h-4 shrink-0 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} 
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 md:w-64 bg-[#0d0d12]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setCurrentModel(m.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 md:px-5 py-3 text-xs md:text-sm transition-all duration-200 flex items-center gap-2 ${
                        currentModel === m.id
                          ? 'bg-cyan-500/10 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                          : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 border-l-2 border-transparent'
                      }`}
                    >
                      {currentModel === m.id && (
                         <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] shrink-0"></div>
                      )}
                      <span className={`truncate ${currentModel === m.id ? '' : 'ml-3'}`}>{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* --- 聊天记录展示区 --- */}
          <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-smooth custom-scrollbar relative z-10">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-gray-500">
                <div className="relative h-16 w-16 md:h-20 md:w-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/10 animate-[spin_10s_linear_infinite]"></div>
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-cyan-500/70 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-xs md:text-sm tracking-widest opacity-70 font-mono">SYSTEM READY // AWAITING INPUT</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div
                    className={`max-w-[90%] md:max-w-[75%] px-5 py-3 md:px-6 md:py-4 text-[14px] md:text-[15px] leading-relaxed shadow-lg min-w-0 ${
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
                              <div className="rounded-xl overflow-hidden my-4 md:my-6 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] bg-[#1e1e1e]">
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
                                  customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '0.875rem' }}
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
            
            {/* AI 思考/输入加载状态 */}
            {isLoading && messages.length > 0 && messages[messages.length - 1].content === '' && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="bg-white/[0.04] px-6 py-4 rounded-[2rem] rounded-tl-sm border border-white/[0.08] backdrop-blur-xl flex items-center gap-2 shadow-lg">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* --- 底部输入区 --- */}
          <footer className="px-4 md:px-6 py-4 md:py-6 pb-6 md:pb-8 z-20">
            <form
              onSubmit={handleSend}
              className="flex items-center relative max-w-4xl mx-auto bg-black/40 backdrop-blur-2xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-white/10 focus-within:border-cyan-500/40 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 p-1.5 md:p-2"
            >
              <input
                className="flex-1 bg-transparent px-4 md:px-6 py-2 md:py-3 text-[14px] md:text-[15px] text-gray-100 placeholder-gray-500 outline-none w-full font-medium"
                value={myInput}
                onChange={(e) => setMyInput(e.target.value)}
                placeholder="发送指令或询问..."
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !myInput.trim()}
                className="ml-2 flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] hover:scale-105 disabled:opacity-30 disabled:scale-100 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300 shrink-0"
              >
                <svg className="w-5 h-5 relative right-[1px] transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </form>
            <div className="text-center mt-3 md:mt-4">
              <span className="text-[10px] md:text-[11px] tracking-wide text-gray-500/70">
                AI 可能会犯错，请核实重要信息。
              </span>
            </div>
          </footer>
        </div>
      </div>

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