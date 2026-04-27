// @ts-nocheck
'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// 精选高性价比组合
const MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
  { id: 'deepseek-chat', name: 'DeepSeek V3' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gpt-4o', name: 'GPT-4o' },
];

export default function ChatPage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentModel, setCurrentModel] = useState<string>(MODELS[0].id);
  
  // 核心修复：彻底弃用 SDK 损坏的输入状态，我们自己用原生 React 接管！绝对不会卡字！
  const [myInput, setMyInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 只从 SDK 提取 messages 和 append (发送动作)
  const { messages, append, isLoading } = useChat({
    body: { model: currentModel },
    onError: (err) => {
      console.error('聊天发生错误:', err);
      alert('抱歉，发送消息时出现错误，请检查网络或刷新页面重试。');
    }
  });

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 鉴权拦截逻辑
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('鉴权请求失败:', error);
        router.push('/login');
      } finally {
        setIsAuthChecking(false);
      }
    };
    verifyUser();
  }, [router]);

  // 自定义发送逻辑
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myInput.trim() || isLoading) return;
    
    // 调用 append 强行把消息塞给大模型
    append({ role: 'user', content: myInput.trim() });
    setMyInput(''); // 瞬间清空输入框，丝滑无比
  };

  // 加载页 (Apple 极简 Loading)
  if (isAuthChecking) {
    return (
      <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-800" />
          <p className="text-sm tracking-widest font-light">验证中...</p>
        </div>
      </div>
    );
  }

  return (
    // 外层容器：限定高度，防止把页脚撑开，打造一个“App化”的窗口
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-5xl mx-auto w-full bg-white font-sans relative">
      
      {/* 顶部悬浮导航条 - 毛玻璃效果 (Apple) */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-gray-100/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
          <h1 className="text-lg font-semibold tracking-tight bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 bg-clip-text text-transparent">
            Xaira 智能空间
          </h1>
        </div>
        
        {/* 精致的模型切换器 */}
        <div className="relative group">
          <select
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
            className="appearance-none bg-gray-50/80 hover:bg-gray-100 border border-gray-200/60 text-gray-600 text-sm font-medium rounded-full pl-5 pr-10 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {/* 下拉小箭头 */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-gray-600 transition-colors">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </header>

      {/* 消息流区域 */}
      <main className="flex-1 overflow-y-auto px-4 pt-24 pb-32 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-32 text-center opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
               <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-tr from-blue-50 to-purple-50 flex items-center justify-center shadow-sm">
                  <span className="text-2xl">✨</span>
               </div>
               <h2 className="text-2xl font-semibold text-gray-800 mb-2 tracking-tight">你好，我是 Xaira</h2>
               <p className="text-gray-400 font-light">今天想聊点什么？我可以帮你写代码、构思文案或解答问题。</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {/* 消息气泡设计 */}
                <div
                  className={`max-w-[85%] px-5 py-3.5 leading-relaxed text-[15px] shadow-sm ${
                    m.role === 'user'
                      ? 'bg-gray-900 text-white rounded-3xl rounded-br-sm font-light' // 用户的气泡：高级黑
                      : 'bg-white border border-gray-100 text-gray-800 rounded-3xl rounded-bl-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)]' // AI的气泡：纯净白+极淡阴影
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </div>
              </div>
            ))
          )}

          {/* AI 思考中动画 (20% Tech 风) */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 px-5 py-4 rounded-3xl rounded-bl-sm shadow-sm flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 底部悬浮输入区 */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-10">
        <form
          onSubmit={handleSend}
          className="max-w-3xl mx-auto relative flex items-end p-1.5 bg-white border border-gray-200/80 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.1)] focus-within:border-gray-300 transition-all duration-300"
        >
          <textarea
            value={myInput}
            onChange={(e) => setMyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="输入你的问题... (Shift+Enter 换行)"
            disabled={isLoading}
            className="flex-1 bg-transparent px-5 py-3.5 max-h-32 min-h-[52px] resize-none outline-none text-gray-800 placeholder-gray-400 font-light text-[15px]"
            rows={1}
          />
          {/* 发送按钮：极致简约的黑色圆角按钮 */}
          <button
            type="submit"
            disabled={isLoading || !myInput.trim()}
            className="shrink-0 m-1 w-11 h-11 flex items-center justify-center rounded-full bg-gray-900 text-white disabled:bg-gray-100 disabled:text-gray-400 transition-all hover:bg-gray-800 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          </button>
        </form>
        <div className="text-center mt-3 text-[11px] text-gray-400 font-light tracking-wide">
          AI 生成内容仅供参考
        </div>
      </footer>
    </div>
  );
}