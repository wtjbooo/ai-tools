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
          
          {/* 案例 1：赛博朋克电影级特写 */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="relative h-56 bg-gray-100">
              <img 
                src="https://pub-2f18be71edc447ebb6a50da53b8ee185.r2.dev/anli/69ceebf9c0ca3aebfb317584ae5ff1de.png" 
                alt="赛博朋克摄影案例" 
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-md">原图参考</div>
            </div>
            <div className="p-6">
              <h3 className="mb-3 text-sm font-bold text-gray-900">🪄 提取提示词 (片段)</h3>
              <div className="rounded-lg bg-gray-50 p-4 font-mono text-xs text-gray-600 leading-6 space-y-3">
                <p className="text-gray-800 font-sans font-medium">电影级特写摄影，一个佩戴发光全息面罩的赛博朋克女孩，站在雨夜的霓虹东京街头。极浅景深，85mm f/1.2 大光圈镜头，背景散景呈现粉蓝色霓虹灯晕。面部有强烈的高光反射，皮肤纹理极其细腻，辛烷值渲染级别的体积光穿透雨丝，极致的细节，8K分辨率，极具未来科幻张力。</p>
                <p className="pt-3 border-t border-gray-200 text-gray-500">Cinematic close-up photography, a cyberpunk girl wearing a glowing holographic visor, standing on a rainy neon-lit Tokyo street. Extremely shallow depth of field, 85mm f/1.2 fast lens, background bokeh featuring pink and blue neon halation. Strong sharp specular highlights on the face, hyper-detailed skin texture, Octane render style volumetric light piercing through the rain, insane details, 8k resolution, futuristic sci-fi tension --ar 16:9 --style raw --v 6.0</p>
              </div>
            </div>
          </div>

          {/* 案例 2：星空银河帆船 */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="relative h-56 bg-gray-100">
              <img 
                src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop" 
                alt="深空星轨摄影案例" 
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-md">原图参考</div>
            </div>
            <div className="p-6">
              <h3 className="mb-3 text-sm font-bold text-gray-900">🪄 提取提示词 (片段)</h3>
              <div className="rounded-lg bg-gray-50 p-4 font-mono text-xs text-gray-600 leading-6 space-y-3">
                <p className="text-gray-800 font-sans font-medium">极致深空摄影，银河星轨悬挂于平静的湖面上空，湖面完美倒影，水天一色，一艘孤独的帆船剪影，地平线远处的雷暴云闪电微光，长曝光摄影，8K分辨率，令人窒息的宁静氛围。</p>
                <p className="pt-3 border-t border-gray-200 text-gray-500">Astrophotography, Milky Way galaxy over a calm glassy lake, perfect water reflection, a solitary sailboat silhouette, distant thunderstorm lightning glow on the horizon, long exposure photography, 8k resolution, breathtakingly peaceful atmosphere --ar 16:9 --v 6.0</p>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}