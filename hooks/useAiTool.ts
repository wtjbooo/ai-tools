// hooks/useAiTool.ts
import { useState } from "react";

export function useAiTool<T>() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = async (apiRoute: string, payload: any) => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const isFormData = payload instanceof FormData;
      const headers: HeadersInit = isFormData ? {} : { "Content-Type": "application/json" };
      const body = isFormData ? payload : JSON.stringify(payload);

      const res = await fetch(apiRoute, {
        method: "POST",
        headers,
        body,
      });
      
      // 🚀 终极防弹升级：先读取为纯文本，防止 HTML 网页导致 JSON 解析崩溃！
      const responseText = await res.text();
      let json;
      
      try {
        json = JSON.parse(responseText);
      } catch (err) {
        // 如果解析 JSON 失败，说明被 Vercel 或内网穿透网关“半路击杀”了
        if (responseText.includes("An error occurred") || responseText.includes("504")) {
           throw new Error("⏳ 请求超时：大模型看图思考时间较长，超出了平台或网关允许的等待时间。");
        }
        throw new Error("📡 网络连接被代理软件或云端网关异常阻断。");
      }
      
      if (!res.ok) {
        throw new Error(json.error || "请求失败，请稍后重试");
      }
      
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