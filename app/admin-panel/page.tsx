"use client";

import { useState } from "react";

export default function AdminFulfillPage() {
  const [orderNo, setOrderNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleFulfill = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outTradeNo: orderNo, adminPassword: password })
      });
      const data = await res.json();
      if (res.ok) setMsg(`✅ ${data.message}`);
      else setMsg(`❌ 失败: ${data.error}`);
    } catch (e) {
      setMsg("❌ 网络异常");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-10 shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">XAira 站长发货后台</h1>
        <p className="text-sm text-gray-500 mb-8">输入微信收到的订单号，为用户一键充值。</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">订单号</label>
            <input 
              value={orderNo} onChange={(e) => setOrderNo(e.target.value)}
              placeholder="ORD_2024..." 
              className="mt-1 w-full rounded-xl bg-gray-50 border-none px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">站长暗号</label>
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入管理员密码" 
              className="mt-1 w-full rounded-xl bg-gray-50 border-none px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <button 
            onClick={handleFulfill} disabled={loading}
            className="w-full rounded-xl bg-black py-4 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "正在处理..." : "确认收款并一键发货"}
          </button>

          {msg && (
            <div className={`mt-4 rounded-lg p-3 text-center text-sm font-medium ${msg.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}