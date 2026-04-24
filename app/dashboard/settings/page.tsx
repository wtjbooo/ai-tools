"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation"; // 改用 Next.js 原生路由
import { User, Shield, Zap, LogOut, Sparkles, CheckCircle2, Mail, Fingerprint, Copy, Check } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter(); // 引入路由
  
  const [engineMode, setEngineMode] = useState<"speed" | "quality">("quality");
  const [isSaving, setIsSaving] = useState(false);
  const [nickname, setNickname] = useState("");
  
  // 复制状态控制
  const [copiedId, setCopiedId] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (user?.name) setNickname(user.name);
    const savedMode = localStorage.getItem("xaira_engine_mode") as "speed" | "quality";
    if (savedMode) setEngineMode(savedMode);
  }, [user]);

  const handleEngineChange = (mode: "speed" | "quality") => {
    setEngineMode(mode);
    localStorage.setItem("xaira_engine_mode", mode);
  };

  const handleSaveProfile = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 800);
  };

  // 原生退出登录逻辑
  const handleLogout = () => {
    // 这里你可以加上清除本地 token 的逻辑，目前先直接跳回登录页
    router.push("/login");
  };

  // 一键复制功能
  const handleCopy = (text: string, type: 'id' | 'email') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 max-w-4xl">
      {/* 头部标题 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          系统设置 <span className="text-zinc-300 font-light">/</span> 
          <span className="text-zinc-400 text-lg font-medium">Preferences</span>
        </h1>
        <p className="text-sm text-zinc-500 mt-1">管理你的个人资料与系统偏好。</p>
      </div>

      <div className="space-y-8">
        
        {/* 模块一：个人资料 */}
        <section className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-zinc-100 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-zinc-100">
              <User className="w-5 h-5 text-zinc-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">个人资料</h2>
          </div>
          
          <div className="p-6 sm:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-50 border border-indigo-50 flex items-center justify-center shrink-0 shadow-inner">
                  <span className="text-2xl font-black text-indigo-300">
                    {nickname.charAt(0)?.toUpperCase() || "X"}
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                  <span className="text-white text-xs font-medium">更换</span>
                </div>
              </div>
              
              <div className="flex-1 space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">显示昵称</label>
                <div className="flex items-center gap-3 max-w-md">
                  <input 
                    type="text" 
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-zinc-200 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium text-zinc-900"
                  />
                  <button 
                    onClick={handleSaveProfile}
                    className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors active:scale-95 whitespace-nowrap"
                  >
                    {isSaving ? "保存中..." : "保存更改"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50/80 rounded-2xl p-5 border border-zinc-100/80 grid grid-cols-1 sm:grid-cols-2 gap-6 relative overflow-hidden">
              <div className="space-y-1.5 relative z-10">
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> 绑定邮箱
                </label>
                <div className="flex items-center gap-2 group/copy">
                  <p className="text-sm font-medium text-zinc-900">
                    {user?.email || "未绑定邮箱"}
                  </p>
                  {user?.email && (
                    <button onClick={() => handleCopy(user.email!, 'email')} className="text-zinc-400 hover:text-indigo-500 transition-colors">
                      {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover/copy:opacity-100 transition-opacity" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 relative z-10">
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5" /> 创作者 ID
                </label>
                <div className="flex items-center gap-2 group/copy">
                  <p className="text-sm font-mono text-zinc-500">
                    {user?.id ? `usr_${user.id}` : "未知"}
                  </p>
                  {user?.id && (
                    <button onClick={() => handleCopy(`usr_${user.id}`, 'id')} className="text-zinc-400 hover:text-indigo-500 transition-colors">
                      {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover/copy:opacity-100 transition-opacity" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 模块二：AI 引擎偏好 */}
        <section className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-zinc-100 overflow-hidden relative group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          <div className="p-6 sm:p-8 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-zinc-100">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">AI 引擎偏好</h2>
          </div>

          <div className="p-6 sm:p-8 relative z-10">
            <p className="text-sm text-zinc-500 mb-6">选择适合你当前工作流的底层算力调度模式。更改后立即生效。</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div 
                onClick={() => handleEngineChange("speed")}
                className={`cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col gap-3 ${engineMode === "speed" ? "border-indigo-500 bg-indigo-50/50 shadow-sm" : "border-zinc-100 hover:border-zinc-200 bg-white"}`}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-xl ${engineMode === "speed" ? "bg-indigo-100 text-indigo-600" : "bg-zinc-50 text-zinc-400"}`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  {engineMode === "speed" && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
                </div>
                <div>
                  <h4 className={`font-bold ${engineMode === "speed" ? "text-indigo-900" : "text-zinc-700"}`}>极速轻量模式</h4>
                  <p className="text-xs text-zinc-500 mt-1">调用低延迟模型，适合灵感爆发期的快速试错。</p>
                </div>
              </div>

              <div 
                onClick={() => handleEngineChange("quality")}
                className={`cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col gap-3 ${engineMode === "quality" ? "border-purple-500 bg-purple-50/50 shadow-sm" : "border-zinc-100 hover:border-zinc-200 bg-white"}`}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-xl ${engineMode === "quality" ? "bg-purple-100 text-purple-600" : "bg-zinc-50 text-zinc-400"}`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  {engineMode === "quality" && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                </div>
                <div>
                  <h4 className={`font-bold ${engineMode === "quality" ? "text-purple-900" : "text-zinc-700"}`}>深度推理模式</h4>
                  <p className="text-xs text-zinc-500 mt-1">调用满血版视觉语言大模型，适合精细化定稿。</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 模块三：危险区域 */}
        <section className="bg-white rounded-[32px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-red-100/60 overflow-hidden">
          <div className="p-6 sm:p-8 flex items-center justify-between bg-gradient-to-r from-red-50/30 to-transparent">
            <div>
              <h2 className="text-[15px] font-bold text-red-900">账号操作</h2>
              <p className="text-[13px] text-red-600/70 mt-0.5">退出当前设备登录状态，保障资产安全。</p>
            </div>
            <button 
              onClick={handleLogout}
              className="px-5 py-2 text-sm font-bold text-red-600 bg-white border border-red-200 shadow-sm hover:bg-red-50 hover:border-red-300 rounded-xl transition-all active:scale-95 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}