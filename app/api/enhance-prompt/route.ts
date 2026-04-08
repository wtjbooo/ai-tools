import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const N1N_API_KEY = process.env.N1N_API_KEY;
const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 新增接收 targetPlatform (目标平台)
    const { text, style, targetModel = "gemini-free", targetPlatform = "通用" } = body;

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "请输入您的初步想法" }, { status: 400 });
    }

    const styleInstruction = style && style !== "通用" 
      ? `\n【风格侧重】：用户指定了【${style}】风格，请在画面描述中强烈体现该风格的代表性特征。` 
      : "";

    // 🚀 核心优化：动态平台适配指令
    const platformInstruction = targetPlatform !== "通用"
      ? `\n【平台深度适配】：用户即将使用【${targetPlatform}】来生成内容。请深度优化提示词：
      - 如果是 Midjourney/SD 等图像平台：请注重光影、构图、材质细节，并可带上引擎参数（如 8k, --ar 16:9）。
      - 如果是 Sora/Runway/Luma/可灵/Pika 等视频平台：请务必增加对【运镜方式】(如 Pan, Tilt, Tracking shot)、【物体运动规律】及【时间连贯性】的动态描述！
      - 如果是即梦/豆包等国内平台：请在中文提示词（promptZh）部分做得极其精准、富有画面感，因为国内平台主要依赖中文解析。`
      : "";

    const systemPrompt = `你是一个世界级的多模态 AI 提示词专家。
任务：将用户的简短想法扩写为顶级美感的画面/视频提示词。

【扩写公式】
画面核心主体 + 细节动作/神态 + 环境背景 + 电影级光影/色彩 + 镜头焦段/视角(视频包含运镜) + 顶级艺术风格 + 平台专属参数${styleInstruction}${platformInstruction}

【强制输出规范 (纯 JSON 对象)】
必须严格返回 JSON，不要任何 Markdown 标记，包含以下三个字段：
- "promptZh": 中文详细提示词（国内平台直接用这个）。
- "promptEn": 英文详细提示词（国外平台直接用这个，用逗号分隔短语）。
- "negativeEn": 英文/中文负面提示词（规避低画质、畸形等缺陷）。`;

    let finalData;

    if (targetModel === "gemini-free") {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `用户的简单想法：${text}` }] }],
        systemInstruction: systemPrompt,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.75,
        }
      });
      finalData = JSON.parse(result.response.text());
    } else {
      if (!N1N_API_KEY) throw new Error("服务端未配置高级模型 API Key");

      const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${N1N_API_KEY}`
        },
        body: JSON.stringify({
          model: targetModel, 
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `用户的简单想法：${text}` }
          ],
          temperature: 0.75,
          response_format: { type: "json_object" } 
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "高级模型请求失败");
      }
      const payload = await response.json();
      finalData = JSON.parse(payload.choices[0].message.content);
    }

    return NextResponse.json(finalData);

  } catch (error: any) {
    console.error("扩写提示词 API 报错:", error);
    return NextResponse.json(
      { error: error.message || "AI 大脑正在重启中，请稍后再试" }, 
      { status: 500 }
    );
  }
}