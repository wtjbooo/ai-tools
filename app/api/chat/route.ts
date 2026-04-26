import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import prisma from "@/lib/prisma";
import { getModelCost } from "@/lib/pricing";

export const maxDuration = 30;

async function getAuthenticatedUser(req: NextRequest) {
  const sessionToken = req.cookies.get("session_token")?.value;
  const lxSession = req.cookies.get("lx_session")?.value;
  if (!sessionToken && !lxSession) return null;
  return await prisma.user.findFirst({
    where: { sessions: { some: { sessionToken: sessionToken || lxSession } } }
  });
}

// 💡 终极精准路由：完美区分“官方直连”与“N1N中转”
function getProviderConfig(modelName: string) {
  // === 第一梯队：官方直连（速度最快、最稳定） ===
  if (modelName === 'deepseek-chat' || modelName === 'deepseek-reasoner') { 
    return { apiKey: process.env.DEEPSEEK_API_KEY, baseURL: process.env.DEEPSEEK_BASE_URL };
  } 
  else if (modelName === 'gemini-1.5-pro') { // 仅当精确等于这个名字时，走谷歌官方
    return { apiKey: process.env.GEMINI_API_KEY, baseURL: process.env.GEMINI_BASE_URL };
  } 
  else if (modelName.includes('LongCat')) {
    return { apiKey: process.env.LONGCAT_API_KEY, baseURL: process.env.LONGCAT_BASE_URL };
  }
  
  // === 第二梯队：N1N 中转站大集合 ===
  // 如果前端传来的名字包含 claude，就用 N1N 的克劳德令牌
  else if (modelName.includes('claude')) {
    return { apiKey: process.env.CLAUDE_GROUP_KEY, baseURL: process.env.N1N_BASE_URL };
  } 
  // 如果前端传来的名字包含 gemini（比如 N1N 的 gemini-3.1-pro），就用 N1N 的 Gemini 令牌
  else if (modelName.includes('gemini')) {
    return { apiKey: process.env.GEMINI_GROUP_KEY, baseURL: process.env.N1N_BASE_URL };
  } 
  // 其他所有没见过的名字（比如各种 GPT），全部用 N1N 的 OpenAI 令牌兜底！
  else {
    return { apiKey: process.env.OPENAI_GROUP_KEY, baseURL: process.env.N1N_BASE_URL };
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return new Response("未登录", { status: 401 });

    const body = await req.json();
    const messages = body.messages;
    const requestedModel = body.model || "gpt-3.5-turbo";

    // 扣费拦截逻辑
    const chatCost = getModelCost(requestedModel, "chat");
    if (user.bonusCredits < chatCost) {
      return new Response("算力积分已耗尽", { status: 402 }); 
    }

    // 💡 动态创建 AI 实例！提取对应平台的配置
    const config = getProviderConfig(requestedModel);
    const customOpenAI = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    const result = streamText({
      model: customOpenAI(requestedModel), 
      messages: messages,
      async onFinish({ text }) {
        try {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: { bonusCredits: { decrement: chatCost } }
            }),
            prisma.aIGenerationRecord.create({
              data: {
                userId: user.id,
                toolType: "chat",
                title: `🤖 智能对话 (${requestedModel})`,
                originalInput: messages[messages.length - 1].content.substring(0, 50), 
                resultJson: "{}",
                cost: chatCost, 
                status: "success"
              }
            })
          ]);
        } catch (dbError) {
          console.error("记账失败:", dbError);
        }
      }
    });

    return result.toDataStreamResponse();
    
  } catch (error) {
    console.error("AI 接口报错了:", error);
    return new Response("AI 服务暂时不可用", { status: 500 });
  }
}