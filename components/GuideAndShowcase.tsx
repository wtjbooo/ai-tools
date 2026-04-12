// components/GuideAndShowcase.tsx
import React from 'react';

export default function GuideAndShowcase() {
  return (
    <div className="mx-auto mt-20 max-w-5xl space-y-20">
      
      {/* 📖 第一部分：极简使用教程 */}
      <section>
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-gray-900">
          只需 3 步，解锁视觉密码
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold">1</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">上传图像/视频素材</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              在任何平台看到心动的视觉作品？无论是高清神图还是惊艳的短视频片段，直接下载或截图，拖拽上传到上方解析框。
            </p>
          </div>
          {/* Step 2 */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold">2</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">AI 深度解构</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              XAira 视觉大脑将逐帧分析，深度剥离画面的主体、光影、材质与动态运镜，为你提炼出专家级 Prompt。
            </p>
          </div>
          {/* Step 3 */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600 font-bold">3</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">一键完美复刻</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              复制提取出的提示词，放入 Midjourney、Stable Diffusion、Sora、Runway 等任意主流 AI 创作平台，见证魔法时刻。
            </p>
          </div>
        </div>
      </section>

      <hr className="border-gray-200/60" />

      {/* ✨ 第二部分：惊艳案例墙 */}
      <section className="pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-gray-900">
          精选反推案例
        </h2>
        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* 案例 1 */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="relative h-56 bg-gray-100">
              {/* 💡 提示：如果图片加载慢，建议把图片下载下来放到 public 文件夹，然后 src 改成 "/image1.jpg" */}
              <img 
                src="https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop" 
                alt="科幻废墟案例" 
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-md">原图参考</div>
            </div>
            <div className="p-6">
              <h3 className="mb-3 text-sm font-bold text-gray-900">🪄 提取提示词 (片段)</h3>
              <div className="rounded-lg bg-gray-50 p-4 font-mono text-xs text-gray-600 leading-6 space-y-3">
                <p className="text-gray-800 font-sans font-medium">电影级广角镜头，长满生物发光苔藓的古代废墟，巨大的开裂石雕，雾气弥漫，情绪光影，虚幻引擎5渲染，史诗级构图。</p>
                <p className="pt-3 border-t border-gray-200 text-gray-500">A cinematic wide shot of ancient ruins overgrown with bioluminescent moss, massive cracked stone statues, foggy atmosphere, moody lighting, Unreal Engine 5 render, epic composition --ar 16:9</p>
              </div>
            </div>
          </div>

          {/* 案例 2 */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="relative h-56 bg-gray-100">
              <img 
                src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop" 
                alt="治愈风景案例" 
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-md">原图参考</div>
            </div>
            <div className="p-6">
              <h3 className="mb-3 text-sm font-bold text-gray-900">🪄 提取提示词 (片段)</h3>
              <div className="rounded-lg bg-gray-50 p-4 font-mono text-xs text-gray-600 leading-6 space-y-3">
                <p className="text-gray-800 font-sans font-medium">吉卜力风格，郁郁葱葱山谷中温馨的小木屋，清晨温柔的阳光透过云层，色彩鲜艳，动漫背景艺术，高度细节，宁静的氛围。</p>
                <p className="pt-3 border-t border-gray-200 text-gray-500">Studio Ghibli style, a cozy wooden cabin in a lush green valley, gentle morning sunlight filtering through clouds, vibrant colors, anime background art, highly detailed, peaceful --ar 4:3</p>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}