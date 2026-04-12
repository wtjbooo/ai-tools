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
      // 判断传入的是 FormData (包含图片文件) 还是普通对象 (纯文本参数)
      const isFormData = payload instanceof FormData;
      
      // 如果是 FormData，绝对不要手动设置 Content-Type，浏览器会自动加上并附带 boundary 参数
      // 如果是普通对象，则设置 application/json
      const headers = isFormData ? {} : { "Content-Type": "application/json" };
      
      // FormData 直接传，普通对象转成字符串传
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