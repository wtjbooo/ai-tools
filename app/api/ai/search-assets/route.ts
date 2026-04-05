// app/api/ai/search-assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const { query, mode } = await req.json();

    // 💡 提速核心：减少生成数量（每个平台3条），严格限制理由字数！
    const systemPrompt = `
      你是一个资深的 AI 搜索策略专家。用户想搜索：“${query}”。侧重方向：【${mode === 'photography' ? '实拍/现场/真实反馈' : '创意/深度/科普'}】。

      🚨【提速指令：精简输出】🚨
      为以下6个平台，【每个平台只生成 3 条】最优质的长尾词。
      1. 抖音
      2. 小红书
      3. 快手
      4. B站
      5. 微博
      6. 知乎

      输出严格的 JSON 格式。注意：reason 必须控制在 15 个字以内，极简！
      {
        "items": [
          {
            "platform": "抖音",
            "title": "观察真实产量对比",
            "searchQuery": "${query} 真实产量 实拍",
            "reason": "直观验证最终效果"
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