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

    // 🌟 终极防坑：强力清洗环境变量，去除可能带来的双引号、单引号和隐藏空格！
    apiKey = apiKey.replace(/['"]/g, '').trim();
    baseURL = baseURL.replace(/['"]/g, '').trim();

    if (!apiKey) {
      throw new Error(`未找到模型 ${selectedModel} 对应的 API Key，请检查服务器 .env 配置`);
    }

      const customProvider = createOpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
      // @ts-ignore 屏蔽 TS 类型检查，强行开启兼容模式！
      compatibility: 'compatible', 
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