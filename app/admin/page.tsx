"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function login() {
    setMsg(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(data.error ?? "登录失败");
    router.push("/admin/submissions");
  }

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-3xl font-bold">后台登录</h1>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="管理员密码"
        className="w-full rounded border px-3 py-2"
      />

      <button onClick={login} className="rounded-xl border px-4 py-2 hover:shadow-sm">
        登录
      </button>

      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}

      <Link className="underline text-sm block" href="/">
        ← 返回首页
      </Link>
    </div>
  );
}