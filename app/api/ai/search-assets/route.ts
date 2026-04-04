// app/api/ai/search-assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const { query, mode } = await req.json();

    const systemPrompt = `
      你现在是一个全网实拍素材聚合引擎。用户正在寻找关于“${query}”的内容。
      你的目标是模拟并生成针对【${mode === 'photography' ? '真实拍摄/现场视频/农田实景' : '创意设计/包装效果'}】的聚合搜索结果。
      
      请覆盖以下平台：
      1. 微博 (Weibo)：侧重实时现场、新闻图片、博主实拍。链接：https://s.weibo.com/weibo?q={keyword}
      2. 抖音 (Douyin)：侧重短视频实测。链接：https://www.douyin.com/search/{keyword}
      3. 小红书 (Xiaohongshu)：侧重精美实拍图文。链接：https://www.xiaohongshu.com/search_result?keyword={keyword}
      4. 快手/惠农网：侧重接地气的农田实操。

      输出要求：
      - 必须返回具体的“素材项目”，而不是搜索建议。
      - 标题要真实。如果是实拍模式，标题应类似“${query}基地实拍”、“看看这批${query}长势如何”。
      - 必须包含微博平台的结果。

      输出严格的 JSON 格式：
      {
        "items": [
          {
            "platform": "微博",
            "title": "今日实拍：${query}现场情况分享",
            "author": "三农频道",
            "reason": "微博上最新的现场实拍图文，包含大量真实细节。",
            "url": "https://s.weibo.com/weibo?q=${encodeURIComponent(query)}"
          },
          {
            "platform": "抖音",
            "title": "${query}品种对比实测视频",
            "author": "种地小哥",
            "reason": "高清视频展示了该品种的真实挂果情况。",
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