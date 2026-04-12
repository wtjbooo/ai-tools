// components/GuideAndShowcase.tsx
import React from 'react';

export default function GuideAndShowcase() {
  return (
    <div className="mx-auto mt-20 max-w-5xl space-y-20">
      
      {/* 📖 第一部分：极简使用教程 */}
      <section>
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-gray-900">
          只需 3 步，解锁画面密码
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold">1</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">上传心动素材</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              在小红书、花瓣看到喜欢的神图？直接截图或保存，拖拽上传到上方解析框。
            </p>
          </div>
          {/* Step 2 */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold">2</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">AI 深度解构</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              XAira 视觉大脑将剥离画面的主体、光影、材质与运镜，提炼出高阶 Prompt。
            </p>
          </div>
          {/* Step 3 */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600 font-bold">3</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">一键完美复刻</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              复制对应的 Midjourney 或标准提示词，放入 AI 绘画工具，见证魔法时刻。
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
              {/* 这里放了一张高质量的占位网图，以后你可以换成你自己的 /example1.jpg */}
              <img 
                src="https://images.unsplash.com/photo-1682687982501-1e58f813fe3a?q=80&w=800&auto=format&fit=crop" 
                alt="科幻废墟案例" 
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-md">原图参考</div>
            </div>
            <div className="p-6">
              <h3 className="mb-3 text-sm font-bold text-gray-900">🪄 提取提示词 (片段)</h3>
              <div className="rounded-lg bg-gray-50 p-4 font-mono text-xs text-gray-600 leading-6">
                A cinematic wide shot of ancient ruins overgrown with bioluminescent moss, massive cracked stone statues, foggy atmosphere, moody lighting, Unreal Engine 5 render, epic composition --ar 16:9
              </div>
            </div>
          </div>

          {/* 案例 2 */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="relative h-56 bg-gray-100">
              {/* 这里也是高质量占位图 */}
              <img 
                src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop" 
                alt="治愈风景案例" 
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-md">原图参考</div>
            </div>
            <div className="p-6">
              <h3 className="mb-3 text-sm font-bold text-gray-900">🪄 提取提示词 (片段)</h3>
              <div className="rounded-lg bg-gray-50 p-4 font-mono text-xs text-gray-600 leading-6">
                Studio Ghibli style, a cozy wooden cabin in a lush green valley, gentle morning sunlight filtering through clouds, vibrant colors, anime background art, highly detailed, peaceful --ar 4:3
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}