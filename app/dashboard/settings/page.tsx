"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { User, Shield, Zap, LogOut, Sparkles, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [engineMode, setEngineMode] = useState<"speed" | "quality">("quality");
  const [isSaving, setIsSaving] = useState(false);

  // 模拟保存操作
  const handleSaveProfile = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  // 模拟退出登录 (请替换为你真实的登出逻辑)
  const handleLogout = () => {
    // 例如：signOut()
    alert("这里将接入你的退出登录逻辑");
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
          
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-50 border border-indigo-50 flex items-center justify-center shrink-0 shadow-inner">
                <span className="text-2xl font-black text-indigo-300">
                  {user?.name?.charAt(0)?.toUpperCase() || "X"}
                </span>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-700 mb-2">昵称</label>
                <input 
                  type="text" 
                  defaultValue={user?.name || "未命名创作者"} 
                  className="w-full max-w-md px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium text-zinc-900"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button 
                onClick={handleSaveProfile}
                className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors active:scale-95 flex items-center gap-2"
              >
                {isSaving ? "保存中..." : "保存更改"}
              </button>
            </div>
          </div>
        </section>

        {/* 模块二：AI 引擎偏好 (20% 科技感) */}
        <section className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-zinc-100 overflow-hidden relative group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          <div className="p-6 sm:p-8 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-zinc-100">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">AI 引擎偏好</h2>
          </div>

          <div className="p-6 sm:p-8 relative z-10">
            <p className="text-sm text-zinc-500 mb-6">选择适合你当前工作流的底层算力调度模式。</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              {/* 选项 A：极速模式 */}
              <div 
                onClick={() => setEngineMode("speed")}
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
                  <p className="text-xs text-zinc-500 mt-1">响应极快，适合大批量初步探索。</p>
                </div>
              </div>

              {/* 选项 B：深度模式 */}
              <div 
                onClick={() => setEngineMode("quality")}
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
                  <p className="text-xs text-zinc-500 mt-1">质量优先，适合最终产出的精细化生成。</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 模块三：危险区域 */}
        <section className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-red-50/50 overflow-hidden">
          <div className="p-6 sm:p-8 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">账号操作</h2>
              <p className="text-sm text-zinc-500 mt-1">退出当前设备登录状态。</p>
            </div>
            <button 
              onClick={handleLogout}
              className="px-5 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-2"
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