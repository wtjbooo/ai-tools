import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();
    const selectedModel = model || 'gpt-4o-mini';

    let apiKey = '';
    let baseURL = '';

    if (selectedModel.startsWith('gpt') || selectedModel.startsWith('claude')) {
      apiKey = selectedModel.startsWith('gpt') ? (process.env.OPENAI_GROUP_KEY || '') : (process.env.CLAUDE_GROUP_KEY || '');
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    } else if (selectedModel === 'gemini-1.5-pro') {
      apiKey = process.env.GEMINI_GROUP_KEY || '';
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    } else if (selectedModel === 'gemini-1.5-flash') {
      apiKey = process.env.GEMINI_API_KEY || '';
      baseURL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
    } else if (selectedModel.startsWith('deepseek')) {
      apiKey = process.env.DEEPSEEK_API_KEY || '';
      baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    } else if (selectedModel.startsWith('LongCat') || selectedModel.toLowerCase().includes('longcat')) {
      apiKey = process.env.LONGCAT_API_KEY || '';
      baseURL = process.env.LONGCAT_BASE_URL || 'https://api.longcat.chat/openai/v1'; 
    }

    // 🌟 强力清洗环境变量，去除可能带来的双引号
    apiKey = apiKey.replace(/['"]/g, '').trim();
    baseURL = baseURL.replace(/['"]/g, '').trim();

    if (!apiKey) {
      throw new Error(`未找到模型 ${selectedModel} 对应的 API Key，请检查服务器 .env 配置`);
    }

    const customProvider = createOpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
      // @ts-ignore
      compatibility: 'compatible', 
      
      // 🛡️ 增加更强力的拦截，准确捕获官方 API 直接返回的 4xx 错误
      fetch: async (url, options) => {
        const res = await fetch(url, options);
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[上游 API 请求失败] 状态码: ${res.status}, 详情: ${errorText}`);
          throw new Error(`API 调用失败: ${res.status} - ${errorText}`);
        }
        return res;
      }
    });

    const result = await streamText({
      model: customProvider(selectedModel),
      messages,
      onError: ({ error }) => {
        console.error('🔥 AI 流式输出发生内部错误:', error);
      }
    });

    // 🚨 终极修复：使用 .pipeThrough(new TextEncoderStream()) 将字符串流转换为标准的字节流！
    // 并且加上 Nginx 防缓冲头，彻底解决白板问题
    return new Response(result.textStream.pipeThrough(new TextEncoderStream()), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', 
      },
    });
    
  } catch (error: any) {
    console.error('Chat API 报错拦截:', error);
    return new Response(
      JSON.stringify({ error: `模型调用失败: ${error.message || '未知错误'}` }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}