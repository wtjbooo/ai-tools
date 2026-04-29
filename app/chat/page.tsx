// @ts-nocheck
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 💰 1. 模型列表增加价格标签配置
const MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (日常/极速)', isFree: false, priceTag: '2x 🪙' },
  { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (逻辑/代码)', isFree: false, priceTag: '45x 🪙' },
  { id: 'deepseek-chat', name: 'DeepSeek V3 (官方)', isFree: false, priceTag: '2x 🪙' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1 (官方思考)', isFree: false, priceTag: '5x 🪙' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (官方免费新版)', isFree: true, priceTag: '免费' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (中转长文本)', isFree: false, priceTag: '25x 🪙' },
  { id: 'gpt-4o', name: 'GPT-4o (复杂任务)', isFree: false, priceTag: '25x 🪙' },
  { id: 'LongCat-Flash-Thinking-2601', name: 'LongCat (长文本特化)', isFree: true, priceTag: '免费' }, 
];

const translateErrorMsg = (errMsg: string) => {
  const msg = String(errMsg || '').toLowerCase();
  
  if (msg.includes('high demand') || msg.includes('503') || msg.includes('overloaded')) {
    return '当前模型访问人数过多，服务器繁忙 (503)。请稍后再试或切换其他模型。';
  }
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) {
    return '请求过于频繁或额度已耗尽 (429)。请稍作休息再试。';
  }
  if (msg.includes('api key') || msg.includes('401') || msg.includes('unauthorized')) {
    return 'API 身份验证失败 (401)。请联系管理员检查后台密钥配置。';
  }
  if (msg.includes('not found') || msg.includes('404')) {
    return '找不到该模型接口 (404)。请确认模型名称是否正确。';
  }
  if (msg.includes('fetch failed') || msg.includes('network')) {
    return '网络连接断开。请检查服务器网络状况。';
  }
  if (msg.includes('积分不足') || msg.includes('额度已用完') || msg.includes('402')) {
    return '算力能源不足，请补充积分或等待免费额度刷新。';
  }
  
  try {
    const match = errMsg.match(/\{.*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.error?.message || parsed.message || '发生未知服务错误，请稍后重试。';
    }
  } catch (e) {}

  return errMsg || '请求失败，请稍后重试。';
};

export default function ChatPage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentModel, setCurrentModel] = useState<string>(MODELS[0].id);
  
  // 💰 2. 新增用户资产状态
  const [userInfo, setUserInfo] = useState({ bonusCredits: 0, freeUsesToday: 0, isPro: false });
  
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

  // 💰 3. 获取用户鉴权及资产信息
  const fetchUserInfo = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.user) {
        setUserInfo({
          bonusCredits: data.user.bonusCredits || 0,
          freeUsesToday: data.user.freeUsesToday || 0,
          isPro: data.user.isPro || false
        });
      }
    } catch (error) {
      console.error('鉴权失败:', error);
      router.push('/login');
    } finally {
      setIsAuthChecking(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
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
      
      // 💰 对话完成后，刷新一下用户资产显示
      fetchUserInfo();
      
    } catch (error) {
      console.error('发送错误:', error);
      setMessages((prev) => {
        const lastIdx = prev.length - 1;
        const friendlyError = translateErrorMsg(error.message);
        const updatedLast = { ...prev[lastIdx], content: prev[lastIdx].content + `\n\n> ⚠️ **系统警报**: ${friendlyError}` };
        return [...prev.slice(0, lastIdx), updatedLast];
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 💰 判断当前选中的模型是否免费，以及资产是否不足
  const selectedModelObj = MODELS.find(m => m.id === currentModel) || MODELS[0];
  const isOutOfEnergy = !selectedModelObj.isFree && userInfo.bonusCredits < 5;
  const isOutOfFreeUses = selectedModelObj.isFree && !userInfo.isPro && userInfo.freeUsesToday <= 0;
  const shouldBlockInput = isOutOfEnergy || isOutOfFreeUses;

  if (isAuthChecking) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050507]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-10 w-10 items-center justify-center">
             <div className="absolute h-full w-full animate-ping rounded-full bg-cyan-500/20"></div>
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400"></div>
          </div>
          <p className="text-sm font-medium tracking-widest text-cyan-400/80">系统初始化验证...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#050507] text-gray-100 font-sans overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-50">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>

      <div className="hidden xl:flex fixed left-6 top-0 bottom-0 flex-col justify-center opacity-[0.15] pointer-events-none select-none z-0">
        <span className="font-mono text-[10px] tracking-[0.4em] text-cyan-400" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          XAIRA NEURAL NETWORK /// SYS.OP.NORMAL
        </span>
      </div>

      <div className="hidden xl:flex fixed right-6 top-0 bottom-0 flex-col justify-center opacity-[0.15] pointer-events-none select-none z-0">
        <span className="font-mono text-[10px] tracking-[0.4em] text-purple-400" style={{ writingMode: 'vertical-rl' }}>
          DATA STREAM ENCRYPTED /// PORT 3000
        </span>
      </div>

      <div className="mx-auto max-w-6xl w-full px-2 sm:px-4 py-4 md:py-6 h-full flex flex-col relative z-10">
        <div className="flex flex-col h-full bg-[#0d0d12]/60 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.6)] border border-white/[0.05] overflow-hidden">
          
          <header className="flex items-center justify-between px-6 md:px-8 py-5 bg-transparent border-b border-white/[0.02] z-30">
            <div className="flex items-center gap-4 md:gap-6">
              <button 
                onClick={() => router.push('/')}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
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
            
            {/* 💰 顶部右侧资产与模型选择区 */}
            <div className="flex items-center gap-3 md:gap-4">
              {/* 资产胶囊指示器 */}
              <div className="hidden sm:flex items-center px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-full text-xs font-mono text-gray-300 group cursor-help transition-colors hover:border-cyan-500/30">
                {selectedModelObj.isFree ? (
                  <>
                    <span className="text-cyan-400 mr-1.5">⚡️</span>
                    {userInfo.isPro ? '无限' : `${userInfo.freeUsesToday} / 15`}
                  </>
                ) : (
                  <>
                    <span className="text-amber-400 mr-1.5">🪙</span>
                    {userInfo.bonusCredits}
                  </>
                )}
                {/* Hover 提示 */}
                <div className="absolute top-14 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all bg-black/80 backdrop-blur-md border border-white/10 px-3 py-2 rounded-lg text-xs whitespace-nowrap z-50">
                  {selectedModelObj.isFree ? '今日剩余免费算力次数' : '当前可用算力点数'}
                </div>
              </div>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 md:gap-3 pl-4 pr-3 py-2 bg-black/30 hover:bg-black/50 text-gray-300 text-xs md:text-sm font-medium rounded-2xl border border-white/[0.08] hover:border-cyan-500/40 transition-all shadow-sm focus:outline-none max-w-[150px] md:max-w-none truncate"
                >
                  <span className="truncate">{selectedModelObj.name}</span>
                  <svg 
                    className={`w-3 h-3 md:w-4 md:h-4 shrink-0 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 md:w-72 bg-[#0d0d12]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setCurrentModel(m.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 md:px-5 py-3 text-xs md:text-sm transition-all duration-200 flex items-center justify-between group ${
                          currentModel === m.id
                            ? 'bg-cyan-500/10 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                            : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {currentModel === m.id && (
                             <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] shrink-0"></div>
                          )}
                          <span className={`truncate ${currentModel === m.id ? '' : 'ml-3'}`}>{m.name}</span>
                        </div>
                        {/* 💰 模型价格小标签 */}
                        <span className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                          m.isFree ? 'border-cyan-500/30 text-cyan-400/80 bg-cyan-500/5' : 'border-white/10 text-gray-500 group-hover:text-amber-400/80 group-hover:border-amber-500/30'
                        }`}>
                          {m.priceTag}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-smooth custom-scrollbar relative z-10">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-gray-500">
                <div className="relative h-16 w-16 md:h-20 md:w-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/10 animate-[spin_10s_linear_infinite]"></div>
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-cyan-500/70 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-sm md:text-base tracking-[0.2em] opacity-80 font-mono text-cyan-50/60">系统已连接 // 等待指令输入</p>
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
                        className="prose prose-invert prose-sm md:prose-base max-w-none text-gray-300 break-words prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-code:text-cyan-300 prose-code:bg-cyan-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-l-cyan-500 prose-blockquote:bg-cyan-500/5 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-lg prose-blockquote:not-italic"
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

          <footer className="px-4 md:px-6 py-4 md:py-6 pb-6 md:pb-8 z-20">
            <form
              onSubmit={handleSend}
              className={`flex items-center relative max-w-4xl mx-auto bg-black/40 backdrop-blur-2xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.5)] border transition-all duration-300 p-1.5 md:p-2 ${
                shouldBlockInput ? 'border-red-500/40 bg-red-500/5' : 'border-white/10 focus-within:border-cyan-500/40 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
              }`}
            >
              <input
                className="flex-1 bg-transparent px-4 md:px-6 py-2 md:py-3 text-[14px] md:text-[15px] text-gray-100 placeholder-gray-500 outline-none w-full font-medium disabled:opacity-50"
                value={myInput}
                onChange={(e) => setMyInput(e.target.value)}
                placeholder={shouldBlockInput ? "能量不足，请补充算力积分或切换免费模型..." : "发送指令或询问..."}
                disabled={isLoading || shouldBlockInput}
              />
              <button
                type="submit"
                disabled={isLoading || !myInput.trim() || shouldBlockInput}
                className="ml-2 flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] hover:scale-105 disabled:opacity-30 disabled:scale-100 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300 shrink-0"
              >
                <svg className="w-5 h-5 relative right-[1px] transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </form>
            <div className="text-center mt-3 md:mt-4 transition-all duration-300 h-4">
              {/* 💰 底部动态状态提示 */}
              {shouldBlockInput ? (
                 <span className="text-[10px] md:text-[11px] tracking-wide text-red-400/90 font-mono animate-pulse">
                   ⚠️ 系统能源耗尽。请补充积分或等待免费配额刷新。
                 </span>
              ) : (
                <span className="text-[10px] md:text-[11px] tracking-wide text-gray-500/70">
                  AI 可能会犯错，请核实重要信息。
                </span>
              )}
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