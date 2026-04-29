export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma'; // 💡 确保这里指向你真实的 prisma 实例文件

// ==========================================
// 💰 第一部分：计费规则与免费配置
// ==========================================

// 每日免费次数上限
const DAILY_FREE_LIMIT = 15;

// 免费模型白名单（匹配关键词即可）
const FREE_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-free', 'longcat'];

// ==========================================
// 💰 后端精准计费表 (单位：每 1000 Tokens 消耗的积分)
// 规则：1 积分 = 1 厘钱 (0.001元)
// = : 根据 N1N 成本价 + 30% 左右利润溢价设定
// ==========================================
const PRICING_MAP: Record<string, { input: number; output: number }> = {
  // --- GPT 系列 (N1N 成本: 1.2 / 4.8) ---
  'gpt-4o-mini': { input: 15, output: 50 }, 
  // (N1N 成本: 20 / 80)
  'gpt-4o': { input: 200, output: 800 }, 
  
  // --- Claude 系列 (N1N 成本: 36 / 180) ---
  'claude-3-5-sonnet-20240620': { input: 350, output: 1600 }, 
  
  // --- DeepSeek 系列 (你自己的 API，极低成本，建议作为主推) ---
  'deepseek-chat': { input: 2, output: 4 }, 
  'deepseek-reasoner': { input: 8, output: 32 }, // R1 思考模型建议略高一点
  
  // --- Gemini 系列 ---
  'gemini-1.5-pro': { input: 200, output: 600 }, 
  
  // --- 默认保底计费 (防止新加模型忘记定价导致亏损) ---
  'default': { input: 50, output: 150 } 
};

export async function POST(req: Request) {
  try {
    // ==========================================
    // 🛡️ 第二部分：用户鉴权与前置校验
    // ==========================================
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: '未登录，请先登录' }), { status: 401 });
    }

    // 查找用户 session 和关联的用户数据
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true }
    });

    if (!session || session.expires < new Date()) {
      return new Response(JSON.stringify({ error: '登录已过期，请重新登录' }), { status: 401 });
    }

    const user = session.user;

    const { messages, model } = await req.json();
    const selectedModel = model || 'gpt-4o-mini';

    // 判断是否为免费模型
    const isFreeModel = FREE_MODELS.some(m => selectedModel.toLowerCase().includes(m));

    // 额度校验逻辑
    if (isFreeModel) {
      if (!user.isPro) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let lastUsed = user.lastUsedDate ? new Date(user.lastUsedDate) : new Date(0);
        lastUsed.setHours(0, 0, 0, 0);

        // 如果最后使用日期不是今天，重置今日可用次数
        let currentFreeUses = user.freeUsesToday;
        if (lastUsed.getTime() < today.getTime()) {
          currentFreeUses = DAILY_FREE_LIMIT;
        }

        if (currentFreeUses <= 0) {
          return new Response(JSON.stringify({ error: '今日免费额度已用完，请升级高级会员或使用其他模型' }), { status: 402 });
        }
      }
    } else {
      // 收费模型，检查积分余额 (假设最低需要 5 积分才能发起对话)
      if (user.bonusCredits < 5) {
        return new Response(JSON.stringify({ error: '账户积分不足，请前往充值' }), { status: 402 });
      }
    }

    // ==========================================
    // 🚀 第三部分：准备 API 请求参数 (保持你原有的优秀逻辑)
    // ==========================================
    let apiKey = '';
    let baseURL = '';
    let apiModel = selectedModel; 

    if (selectedModel.startsWith('gpt') || selectedModel.startsWith('claude')) {
      apiKey = selectedModel.startsWith('gpt') ? (process.env.OPENAI_GROUP_KEY || '') : (process.env.CLAUDE_GROUP_KEY || '');
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    } 
    else if (selectedModel === 'gemini-1.5-pro') {
      apiKey = process.env.GEMINI_GROUP_KEY || '';
      baseURL = process.env.N1N_BASE_URL || 'https://api.n1n.ai/v1';
    } 
    else if (
      selectedModel.includes('gemini-2.5-flash') || 
      selectedModel.includes('gemini-1.5-flash') || 
      selectedModel.includes('gemini-free')
    ) {
      apiKey = process.env.GEMINI_API_KEY || '';
      baseURL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';
      apiModel = 'gemini-2.5-flash'; 
    }
    else if (selectedModel.startsWith('deepseek')) {
      apiKey = process.env.DEEPSEEK_API_KEY || '';
      baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    } 
    else if (selectedModel.includes('LongCat') || selectedModel.toLowerCase().includes('longcat')) {
      apiKey = process.env.LONGCAT_API_KEY || '';
      baseURL = process.env.LONGCAT_BASE_URL || 'https://api.longcat.chat/v1'; 
      apiModel = 'LongCat-Flash-Thinking-2601'; 
    }

    apiKey = apiKey.replace(/['"]/g, '').trim();
    baseURL = baseURL.replace(/['"]/g, '').trim();

    if (!apiKey) {
      throw new Error(`未找到模型 ${selectedModel} 对应的 API Key，请检查服务器 .env 配置`);
    }

    const apiUrl = baseURL.endsWith('/chat/completions') 
      ? baseURL 
      : `${baseURL.replace(/\/$/, '')}/chat/completions`;

    // 💡 提示：为了让标准 API 返回 usage 数据，在 stream 模式下通常需要开启 stream_options
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: apiModel, 
        messages: messages,
        stream: true,
        stream_options: { include_usage: true } // 🔥 核心：要求大模型在流结束时返回 Token 消耗
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 拒绝调用 (${response.status}): ${errorText}`);
    }

    // ==========================================
    // 📊 第四部分：原生流式解析与静默扣费
    // ==========================================
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }
        const decoder = new TextDecoder('utf-8');
        const encoder = new TextEncoder();
        let buffer = '';
        
        // 用于记录 Token 消耗
        let promptTokens = 0;
        let completionTokens = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; 

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
              
              if (trimmedLine.startsWith('data: ')) {
                try {
                  const jsonStr = trimmedLine.slice(6);
                  const data = JSON.parse(jsonStr);
                  
                  // 1. 提取内容发给前端
                  const delta = data.choices?.[0]?.delta;
                  if (delta) {
                    const chunkText = delta.content || delta.reasoning_content || '';
                    if (chunkText) {
                      controller.enqueue(encoder.encode(chunkText));
                    }
                  }

                  // 2. 提取并累加 Token 消耗 (只在最后的 chunk 中存在)
                  if (data.usage) {
                    promptTokens = data.usage.prompt_tokens || 0;
                    completionTokens = data.usage.completion_tokens || 0;
                  }
                } catch (e) {}
              }
            }
          }
        } catch (err) {
          console.error('读取流时发生错误:', err);
        } finally {
          controller.close();
          
          // ==========================================
          // 💸 结算环节：对话结束后，异步扣除数据库积分
          // ==========================================
          try {
            if (isFreeModel) {
              if (!user.isPro) {
                // 免费模型：扣除一次今日额度，并更新最后使用时间
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                let lastUsed = user.lastUsedDate ? new Date(user.lastUsedDate) : new Date(0);
                lastUsed.setHours(0, 0, 0, 0);

                let newFreeUses = user.freeUsesToday;
                if (lastUsed.getTime() < today.getTime()) {
                  newFreeUses = DAILY_FREE_LIMIT - 1; // 跨天重置并扣除本次
                } else {
                  newFreeUses = Math.max(0, newFreeUses - 1); // 扣除本次
                }

                await prisma.user.update({
                  where: { id: user.id },
                  data: { 
                    freeUsesToday: newFreeUses, 
                    lastUsedDate: new Date() 
                  }
                });
              }
            } else {
              // 收费模型：根据定价表和 Token 数量计算费用
              // 注意：有些模型在流突然中断时可能没返回 usage，我们可以给个默认保底扣费 1 分防止白嫖
              if (promptTokens > 0 || completionTokens > 0) {
                const pricing = PRICING_MAP[selectedModel] || PRICING_MAP['default'];
                // 公式：(输入Token * 输入单价 / 1000) + (输出Token * 输出单价 / 1000)
                const cost = Math.ceil((promptTokens * pricing.input / 1000) + (completionTokens * pricing.output / 1000));
                
                if (cost > 0) {
                  await prisma.user.update({
                    where: { id: user.id },
                    data: { bonusCredits: { decrement: cost } }
                  });
                  console.log(`[扣费成功] 用户: ${user.id}, 模型: ${selectedModel}, 扣除: ${cost} 积分`);
                }
              }
            }
          } catch (dbError) {
            console.error('扣费数据库操作失败:', dbError);
          }
        }
      }
    });

    return new Response(stream, {
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
      JSON.stringify({ error: `调用失败: ${error.message || '未知错误'}` }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}