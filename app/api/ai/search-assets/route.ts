// app/api/ai/search-assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const { query, mode } = await req.json();

    const systemPrompt = `
      你是一个全网资源聚合导航引擎。用户搜索词：“${query}”。模式：【${mode === 'photography' ? '真实拍摄' : '创意设计'}】。

      🚨【极度重要的硬性指标】🚨
      请你务必、必须、一定要生成总计【至少 24 条】数据！
      严格按照以下4个平台，【每个平台必须生成 6 条不同的结果】：
      1. 抖音
      2. 小红书
      3. 微博
      4. 快手

      如果你生成的数据少于 24 条，将被视为严重失败！请发挥你所有的想象力模拟出真实的标题和作者。

      输出严格的 JSON 格式：
      {
        "items": [
          {
            "platform": "抖音",
            "title": "真实验证！${query} 在这片地里的真实表现",
            "author": "务农阿强",
            "reason": "多角度实拍",
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
    console.error("AI 搜索失败:", error);
    return NextResponse.json({ error: "聚合搜索失败" }, { status: 500 });
  }
}