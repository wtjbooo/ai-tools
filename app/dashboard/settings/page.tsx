"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { User, Shield, Zap, LogOut, Sparkles, CheckCircle2, Mail, Fingerprint } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  
  // 引擎状态持久化 (真实可用)
  const [engineMode, setEngineMode] = useState<"speed" | "quality">("quality");
  const [isSaving, setIsSaving] = useState(false);
  const [nickname, setNickname] = useState("");

  // 初始化读取本地偏好
  useEffect(() => {
    if (user?.name) setNickname(user.name);
    const savedMode = localStorage.getItem("xaira_engine_mode") as "speed" | "quality";
    if (savedMode) setEngineMode(savedMode);
  }, [user]);

  // 切换引擎并保存到本地
  const handleEngineChange = (mode: "speed" | "quality") => {
    setEngineMode(mode);
    localStorage.setItem("xaira_engine_mode", mode);
  };

  // 模拟保存操作
  const handleSaveProfile = () => {
    setIsSaving(true);
    // 这里未来接入你的 /api/user/update 接口
    setTimeout(() => setIsSaving(false), 800);
  };

  // 模拟退出登录
  const handleLogout = () => {
    alert("接入 Auth.js 的 signOut() 即可安全退出");
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
        
        {/* 模块一：丰满后的个人资料 */}
        <section className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-zinc-100 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-zinc-100">
              <User className="w-5 h-5 text-zinc-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">个人资料</h2>
          </div>
          
          <div className="p-6 sm:p-8 space-y-8">
            {/* 头像与昵称区域 */}
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
              
              <div className="flex-1 space-y-1">
                <label className="block text-sm font-medium text-zinc-700">显示昵称</label>
                <div className="flex items-center gap-3 max-w-md">
                  <input 
                    type="text" 
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium text-zinc-900"
                  />
                  <button 
                    onClick={handleSaveProfile}
                    className="px-5 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors active:scale-95 whitespace-nowrap min-w-[80px]"
                  >
                    {isSaving ? "保存..." : "保存"}
                  </button>
                </div>
              </div>
            </div>

            {/* 分割线 */}
            <div className="h-px w-full bg-zinc-100"></div>

            {/* 新增：只读账号信息展示，填补视觉空白 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> 绑定邮箱
                </label>
                <p className="text-sm font-medium text-zinc-900">
                  {user?.email || "未绑定邮箱"}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5" /> 创作者 ID
                </label>
                <p className="text-sm font-mono text-zinc-500">
                  {user?.id ? `usr_${user.id.substring(0, 8)}...` : "未知"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 模块二：AI 引擎偏好 (真实交互版) */}
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
                  <p className="text-xs text-zinc-500 mt-1">响应极快，调用轻量级模型，适合脑暴与初步探索。</p>
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
                  <p className="text-xs text-zinc-500 mt-1">质量优先，调用顶级视觉/语言模型进行精细化生成。</p>
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
              <p className="text-sm text-zinc-500 mt-1">退出当前设备登录状态，保障资产安全。</p>
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