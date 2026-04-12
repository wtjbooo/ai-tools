// hooks/useAiTool.ts
import { useState } from "react";

export function useAiTool<T>() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 通用的请求执行器
  const execute = async (apiRoute: string, payload: any) => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      // 🚀 核心升级：智能侦测 payload 类型
      const isFormData = payload instanceof FormData;
      
      // ✨ 修复：加上了 HeadersInit 类型定义，完美安抚 TypeScript 编译器
      const headers: HeadersInit = isFormData ? {} : { "Content-Type": "application/json" };
      
      const body = isFormData ? payload : JSON.stringify(payload);

      const res = await fetch(apiRoute, {
        method: "POST",
        headers,
        body,
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "请求失败，请稍后重试");
      }
      
      // 🚀 核心修复：智能解包
      const finalData = json.data !== undefined ? json.data : json;
      setResults(finalData);
      
    } catch (err: any) {
      console.error("AI 工具调用失败:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { loading, results, error, execute };
}