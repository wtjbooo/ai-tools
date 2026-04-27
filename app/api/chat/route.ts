import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();
    const selectedModel = model || 'gpt-4o-mini';

    // 1. 初始化我们要动态使用的 Key 和 URL
    let apiKey = '';
    let baseURL = '';

    // 2. 根据前端传来的模型名称，智能路由到对应的环境变量
    if (selectedModel.startsWith('gpt')) {
      // GPT 系列走 N1N 的 OpenAI 分组
      apiKey = process.env.OPENAI_GROUP_KEY || '';
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    } else if (selectedModel.startsWith('claude')) {
      // Claude 系列走 N1N 的 Claude 分组
      apiKey = process.env.CLAUDE_GROUP_KEY || '';
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    } else if (selectedModel === 'gemini-1.5-flash') {
      // 官方免费版 Gemini
      apiKey = process.env.GEMINI_API_KEY || '';
      baseURL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
    } else if (selectedModel === 'gemini-1.5-pro') {
      // N1N 付费版优质 Gemini
      apiKey = process.env.GEMINI_GROUP_KEY || '';
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    } else if (selectedModel.startsWith('deepseek')) {
      // 官方 DeepSeek
      apiKey = process.env.DEEPSEEK_API_KEY || '';
      baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    } else if (selectedModel.startsWith('longcat')) {
      // 官方 LongCat (预留)
      apiKey = process.env.LONGCAT_API_KEY || '';
      baseURL = process.env.LONGCAT_BASE_URL || '';
    } else {
      // 兜底默认选项
      apiKey = process.env.OPENAI_GROUP_KEY || '';
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    }

    // 检查是否配置了密钥
    if (!apiKey) {
      throw new Error(`未找到模型 ${selectedModel} 对应的 API Key，请检查 .env 文件`);
    }

    // 3. 动态创建 OpenAI 兼容客户端
    // 因为 N1N、DeepSeek、Google 等都支持 OpenAI 接口格式，所以我们可以统一用 createOpenAI！
    const customProvider = createOpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });

    // 4. 发起请求并返回流
    const result = await streamText({
      model: customProvider(selectedModel),
      messages,
    });

    return result.toTextStreamResponse(); // <--- 修改为这个
    
  } catch (error: any) {
    console.error('Chat API 报错:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'AI 服务暂时不可用，请稍后再试。' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}