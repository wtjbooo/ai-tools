// app/api/ai/search-assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "请输入搜索需求" }, { status: 400 });
    }

    const systemPrompt = `
      你是一个资深的 AI 素材猎手。你的任务是根据用户输入的素材需求，生成在主流社交和设计平台上的精准搜索建议。
      
      请针对以下平台生成搜索策略：
      1. 小红书 (Xiaohongshu)：侧重审美、灵感、UI布局。
      2. 抖音 (Douyin)：侧重动态视频、特效、实操效果。
      3. 站酷 (Zcool)：侧重专业平面、3D、大屏设计稿。
      
      输出必须是严格的 JSON 格式，包含一个 suggestions 数组，结构如下：
      {
        "suggestions": [
          {
            "platform": "平台名称",
            "title": "针对该平台优化的搜索词",
            "reason": "为什么要这么搜，以及能找到什么",
            "url": "该平台的搜索直达链接"
          }
        ]
      }

      搜索链接模板：
      - 小红书: https://www.xiaohongshu.com/search_result?keyword={keyword}
      - 抖音: https://www.douyin.com/search/{keyword}
      - 站酷: https://www.zcool.com.cn/search/content?word={keyword}

      请确保生成的 keyword 经过 URL 编码。用户需求：${query}
    `;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();
    
    // 清理可能存在的 Markdown 代码块标记
    const cleanedJson = responseText.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanedJson);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[AI_SEARCH_ERROR]", error);
    return NextResponse.json({ error: "AI 搜索生成失败" }, { status: 500 });
  }
}