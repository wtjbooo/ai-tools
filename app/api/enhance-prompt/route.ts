import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// 初始化 Gemini 客户端，使用现有的 API KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "请输入您的初步想法" }, { status: 400 });
    }

    // 调用最快、性价比最高的 Gemini 2.5 Flash 模型
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 核心：极度硬核的 System Prompt，约束输出格式
    const systemPrompt = `
    你是一个世界级的 Midjourney 和 AI 绘画提示词专家。
    用户会输入一个非常简单的想法或词语，你的任务是将其扩写为一段专业、细节丰富、富有想象力的画面提示词。
    
    【扩写公式】
    主体特征 + 动作/表情 + 环境背景 + 电影级光影 + 镜头视角 + 顶级艺术风格 + 渲染引擎参数（如 8k, Unreal Engine 5, --ar 16:9 --v 6.0）
    
    【强制输出要求】
    严格以 JSON 格式输出，必须包含以下两个字段，不要有任何多余的废话：
    - promptZh: 中文版本的详细提示词（用于用户阅读体验）
    - promptEn: 英文版本的详细提示词（直接用于喂给 Midjourney 等画图工具）
    
    【注意】
    不要返回 Markdown 代码块符号（如 \`\`\`json），只返回纯 JSON 字符串！
    `;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `用户的简单想法：${text}` }
    ]);

    const responseText = result.response.text();
    
    // 清理大模型可能带上的 markdown 标记，确保 JSON 解析不报错
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanJson);

    return NextResponse.json(data);

  } catch (error) {
    console.error("扩写提示词 API 报错:", error);
    return NextResponse.json(
      { error: "AI 大脑正在重启中，请稍后再试" }, 
      { status: 500 }
    );
  }
}