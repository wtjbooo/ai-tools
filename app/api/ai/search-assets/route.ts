// app/api/ai/search-assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const { query, mode } = await req.json();

    const systemPrompt = `
      你现在是一个全网资源聚合导航引擎。用户正在搜索：“${query}”。
      偏好模式：【${mode === 'photography' ? '真实拍摄/农田实景/现场视频' : '创意设计/效果图'}】。

      请严格按照以下4个平台，每个平台至少生成 3~4 条精准的素材导航（总计 12~16 条数据）：
      1. 抖音 (侧重短视频实测)
      2. 小红书 (侧重精美图文和笔记)
      3. 微博 (侧重实时资讯和现场反馈)
      4. 快手 (侧重下沉市场和真实农务)

      输出要求：
      - 必须是具体的素材标题，足够真实。
      - 输出严格的 JSON 格式，不要多余的 Markdown 代码。
      
      {
        "items": [
          {
            "platform": "抖音",
            "title": "${query} 高产实测现场，果实累累！",
            "author": "三农老李",
            "reason": "直观展示长势",
            "url": "https://www.douyin.com/search/${encodeURIComponent(query)}"
          }
        ]
      }
    `;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();
    const cleanedJson = responseText.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanedJson);

    return NextResponse.json({ success: true, data: data.items });
  } catch (error) {
    return NextResponse.json({ error: "聚合搜索失败" }, { status: 500 });
  }
}