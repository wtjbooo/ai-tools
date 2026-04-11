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
      const res = await fetch(apiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "请求失败，请稍后重试");
      }
      
      // 🚀 核心修复：智能解包！
      // 如果后端包了一层 data 属性，就用 json.data；如果后端直接返回了对象，就直接用 json。
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