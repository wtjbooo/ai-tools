// @ts-nocheck
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ✅ 引入 Markdown 与代码高亮组件
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (日常/极速)' },
  { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (逻辑/代码)' },
  { id: 'deepseek-chat', name: 'DeepSeek V3 (官方)' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1 (官方思考)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (官方免费)' },
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

  // ✅ 优化 1：添加滚动锚点引用
  const scrollContainerRef = useRef<HTMLElement>(null);

  // ✅ 优化 1：每次消息更新时，平滑滚动到底部
  useEffect(() => {
  if (scrollContainerRef.current) {
    // 只滚动聊天容器本身，绝不影响外层网页
    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }
}, [messages]);

  // 鉴权拦截
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
          let chunk = decoder.decode(value, { stream: true });
          if (chunk.startsWith('0:"')) {
            chunk = chunk.replace(/^0:"/, '').replace(/"\n?$/, '').replace(/\\n/g, '\n');
          }
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
      <div className="flex h-[70vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600"></div>
          <p className="text-sm text-gray-500 font-medium">正在验证身份...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 h-[calc(100vh-120px)] min-h-[600px]">
      <div className="flex flex-col h-full bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden ring-1 ring-gray-900/5">
        
        <header className="flex items-center justify-between px-8 py-5 bg-white/40 backdrop-blur-md border-b border-gray-100/50 z-10">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
            <h1 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              XAira智能助手
            </h1>
          </div>
          
          <select
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
            className="px-4 py-2 bg-gray-50/80 hover:bg-gray-100/80 text-gray-700 text-sm font-medium rounded-2xl border-0 ring-1 ring-inset ring-gray-200/50 focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer outline-none appearance-none pr-8 relative"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </header>
        <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#F5F5F7]/30">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.792 0-5.484-.12-8.135-.35-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <p className="font-medium tracking-wide">今天想聊点什么？</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] md:max-w-[75%] px-6 py-4 text-[15px] leading-relaxed shadow-sm min-w-0 ${
                    m.role === 'user'
                      ? 'bg-gray-900 text-white rounded-[2rem] rounded-tr-sm' 
                      : 'bg-white text-gray-800 rounded-[2rem] rounded-tl-sm ring-1 ring-gray-900/5' 
                  }`}
                >
                  {/* ✅ 优化 2：彻底替换为 Markdown + 高亮支持 */}
                  {m.role === 'user' ? (
                    <pre className="whitespace-pre-wrap font-sans m-0 text-inherit">{m.content}</pre>
                  ) : (
                    <ReactMarkdown
                      className="prose prose-sm md:prose-base max-w-none text-gray-800 break-words"
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <div className="rounded-xl overflow-hidden my-5 border border-gray-200/60 shadow-sm">
                              {/* MacOS 终端风格顶部标题栏 */}
                              <div className="flex items-center px-4 py-2 bg-[#21252b] text-gray-400 text-xs font-mono">
                                <div className="flex gap-1.5 mr-4">
                                  <div className="w-3 h-3 rounded-full bg-red-500/90 shadow-[0_0_4px_rgba(239,68,68,0.4)]"></div>
                                  <div className="w-3 h-3 rounded-full bg-yellow-500/90 shadow-[0_0_4px_rgba(234,179,8,0.4)]"></div>
                                  <div className="w-3 h-3 rounded-full bg-green-500/90 shadow-[0_0_4px_rgba(34,197,94,0.4)]"></div>
                                </div>
                                <span className="uppercase tracking-wider">{match[1]}</span>
                              </div>
                              <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{ margin: 0, padding: '1.25rem', background: '#282c34', fontSize: '0.875rem' }}
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-mono text-sm before:content-[''] after:content-['']" {...props}>
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
            <div className="flex justify-start">
              <div className="bg-white px-6 py-4 rounded-[2rem] rounded-tl-sm shadow-sm ring-1 ring-gray-900/5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          {/* ✅ 优化 1：底部锚点 */}
          
        </main>

        <footer className="p-6 bg-white/40 backdrop-blur-md border-t border-gray-100/50">
          <form
            onSubmit={handleSend}
            className="flex items-center relative max-w-4xl mx-auto bg-white rounded-full shadow-[0_2px_12px_rgb(0,0,0,0.06)] ring-1 ring-gray-900/5 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all duration-300 p-2"
          >
            <input
              className="flex-1 bg-transparent px-6 py-3 text-[15px] text-gray-800 placeholder-gray-400 outline-none w-full"
              value={myInput}
              onChange={(e) => setMyInput(e.target.value)}
              placeholder="发送消息..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !myInput.trim()}
              className="ml-2 flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:opacity-90 disabled:opacity-40 disabled:hover:shadow-md disabled:cursor-not-allowed transition-all duration-200 shrink-0"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 relative right-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-3">
            <span className="text-[11px] text-gray-400 font-medium">AI 可能会犯错，请核实重要信息。</span>
          </div>
        </footer>
      </div>
    </div>
  );
}