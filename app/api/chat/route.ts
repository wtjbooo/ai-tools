import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();
    const selectedModel = model || 'gpt-4o-mini';

    let apiKey = '';
    let baseURL = '';

    // 严丝合缝的模型路由分发
    if (selectedModel.startsWith('gpt') || selectedModel.startsWith('claude')) {
      // 1. GPT 和 Claude 走 N1N 中转
      apiKey = selectedModel.startsWith('gpt') ? (process.env.OPENAI_GROUP_KEY || '') : (process.env.CLAUDE_GROUP_KEY || '');
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
      
    } else if (selectedModel === 'gemini-1.5-pro') {
      // 2. Gemini Pro 走 N1N 中转
      apiKey = process.env.GEMINI_GROUP_KEY || '';
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
      
    } else if (selectedModel === 'gemini-1.5-flash') {
      // 3. Gemini Flash 走官方免费直连
      apiKey = process.env.GEMINI_API_KEY || '';
      baseURL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
      
    } else if (selectedModel.startsWith('deepseek')) {
      // 4. DeepSeek 走官方直连
      apiKey = process.env.DEEPSEEK_API_KEY || '';
      baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
      
    } else if (selectedModel === 'LongCat-Flash-Thinking') {
      // 5. Longcat 走官方直连
      apiKey = process.env.LONGCAT_API_KEY || '';
      // 注意：确保你的 .env 里 LONGCAT_BASE_URL 填的是准确的兼容接口地址
      baseURL = process.env.LONGCAT_BASE_URL || 'https://api.longcat.chat/v1/chat/completions'; 
    }

    if (!apiKey) {
      throw new Error(`未找到模型 ${selectedModel} 对应的 API Key，请检查服务器 .env 配置`);
    }

    const customProvider = createOpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });

    const result = await streamText({
      model: customProvider(selectedModel),
      messages,
    });

    return result.toTextStreamResponse();
    
  } catch (error: any) {
    console.error('Chat API 报错拦截:', error);
    // 把详细错误返回给前端气泡
    return new Response(
      JSON.stringify({ error: `模型调用失败: ${error.message || '未知错误'}` }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}