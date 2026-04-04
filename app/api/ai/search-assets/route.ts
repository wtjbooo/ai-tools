// app/api/ai/search-assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const { query, mode } = await req.json();

    // 💡 核心转变：生成高质量搜索策略
    const systemPrompt = `
      你是一个资深的 AI 搜索策略专家。用户想搜索：“${query}”。侧重方向：【${mode === 'photography' ? '实拍/现场/真实反馈' : '创意/深度/科普'}】。

      🚨【任务目标】🚨
      不要伪造具体的视频或文章！请你为用户生成全网多平台的【高效搜索切入点（长尾词）】。
      总计生成 24 条数据，严格按照以下6个平台，【每个平台 4 条】：
      1. 抖音 (偏向直观实拍、效果验证)
      2. 小红书 (偏向个人经验、攻略、避坑)
      3. 快手 (偏向下沉市场、真实用户记录)
      4. B站 (偏向硬核评测、详细解说)
      5. 微博 (偏向实时热点、大众讨论)
      6. 知乎 (偏向专业原理解析、深度问答)

      输出严格的 JSON 格式，其中 searchQuery 是你推荐在对应平台搜索的精准长尾词：
      {
        "items": [
          {
            "platform": "抖音",
            "title": "观察真实产量对比",
            "searchQuery": "${query} 真实产量 实拍",
            "reason": "抖音有大量农户/用户的实拍视频，适合直观验证最终效果。",
            "url": "https://www.douyin.com/search/"
          }
        ]
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    const data = JSON.parse(responseText);

    // 在后端直接把推荐的搜索词拼接到 URL 里，减轻前端负担
    const enrichedData = data.items.map((item: any) => {
      const keyword = encodeURIComponent(item.searchQuery);
      let realUrl = "";
      switch (item.platform) {
        case "抖音": realUrl = `https://www.douyin.com/search/${keyword}`; break;
        case "小红书": realUrl = `https://www.xiaohongshu.com/search_result?keyword=${keyword}`; break;
        case "快手": realUrl = `https://www.kuaishou.com/search/video?searchKey=${keyword}`; break;
        case "B站": realUrl = `https://search.bilibili.com/all?keyword=${keyword}`; break;
        case "微博": realUrl = `https://s.weibo.com/weibo?q=${keyword}`; break;
        case "知乎": realUrl = `https://www.zhihu.com/search?q=${keyword}`; break;
        default: realUrl = `https://www.google.com/search?q=${keyword}`;
      }
      return { ...item, url: realUrl };
    });

    return NextResponse.json({ success: true, data: enrichedData });
  } catch (error) {
    console.error("AI 搜索失败:", error);
    return NextResponse.json({ error: "聚合搜索失败" }, { status: 500 });
  }
}