// app/api/ai/search-assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// 💡 使用最新的 2.5 Flash 模型
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const { query, mode } = await req.json();

    const systemPrompt = `
      你是一个全网资源聚合导航引擎。用户搜索词：“${query}”。模式：【${mode === 'photography' ? '真实拍摄' : '创意设计'}】。

      🚨【极度重要的硬性指标】🚨
      请你务必生成总计【至少 24 条】数据！
      严格按照以下6个平台，【每个平台必须生成 4 条不同的结果】：
      1. 抖音 (短视频)
      2. 小红书 (图文)
      3. 快手 (短视频)
      4. B站 (长视频)
      5. 微博 (资讯)
      6. 知乎 (深度回答)

      为了让前端 UI 呈现完美的 Apple 级质感，请你务必为每个数据生成 coverUrl 封面图。
      - 如果是 抖音、小红书、快手，请使用竖版图片：https://picsum.photos/seed/你的随机英文词/400/600
      - 如果是 B站、微博、知乎，请使用横版图片：https://picsum.photos/seed/你的随机英文词/600/400
      (请把“你的随机英文词”替换为与 ${query} 相关的不同英文单词，确保每张图片不同)

      输出严格的 JSON 格式：
      {
        "items": [
          {
            "platform": "抖音",
            "title": "真实验证！${query} 在这片地里的真实表现",
            "author": "务农阿强",
            "reason": "多角度实拍验证，效果直观",
            "url": "https://www.douyin.com/search/${encodeURIComponent(query)}",
            "coverUrl": "https://picsum.photos/seed/agriculture1/400/600"
          }
        ]
      }
    `;

    // 💡 开启强制 JSON 返回模式，彻底告别正则解析报错
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    const data = JSON.parse(responseText);

    return NextResponse.json({ success: true, data: data.items });
  } catch (error) {
    console.error("AI 搜索失败:", error);
    return NextResponse.json({ error: "聚合搜索失败" }, { status: 500 });
  }
}