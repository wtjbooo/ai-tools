'use client';

import React, { useState } from 'react';
import { Send, Loader2, Radio } from 'lucide-react';

export default function AdminDashboard() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('system');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState('');

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return alert("标题和内容不能为空哦！");

    setIsSending(true);
    setResult('');

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, type }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setResult('✅ 发送成功！全站用户都能收到了！');
        setTitle('');
        setContent('');
      } else {
        setResult('❌ 发送失败：' + data.error);
      }
    } catch (err) {
      setResult('❌ 网络错误，请重试');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Radio className="w-6 h-6 text-indigo-500" />
          全站广播中心
        </h1>
        <p className="text-zinc-500 mt-2 text-sm">
          在这里发送的消息，将会通过弹窗和消息盒子，送达给数据库中的每一位用户。
        </p>
      </div>

      <form onSubmit={handleBroadcast} className="bg-white/80 backdrop-blur-xl border border-zinc-200/60 rounded-[32px] p-6 sm:p-8 shadow-sm">
        
        {/* 消息类型选择 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-zinc-700 mb-3">消息类型</label>
          <div className="flex gap-4">
            {['system', 'billing', 'task'].map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="type" 
                  value={t} 
                  checked={type === t} 
                  onChange={(e) => setType(e.target.value)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="text-sm text-zinc-600">
                  {t === 'system' ? '系统升级' : t === 'billing' ? '资产变动' : '任务通知'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 标题输入 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-zinc-700 mb-2">通知标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：Sora 满血版限时 5 折"
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
          />
        </div>

        {/* 内容输入 */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-zinc-700 mb-2">通知正文</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="输入要告诉用户的具体内容..."
            rows={4}
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm resize-none custom-scrollbar"
          />
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={isSending}
          className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white py-3.5 rounded-2xl font-medium transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {isSending ? '正在全站发射...' : '立即发送全站广播'}
        </button>

        {/* 结果提示 */}
        {result && (
          <div className={`mt-4 p-3 rounded-xl text-sm text-center font-medium animate-in fade-in ${result.includes('✅') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {result}
          </div>
        )}
      </form>
    </div>
  );
}