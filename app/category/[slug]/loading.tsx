export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-8 sm:space-y-12">
        {/* 头部加载骨架 - 与真实页面的圆角和内边距完全一致 */}
        <section className="overflow-hidden rounded-[36px] border border-black/[0.03] bg-white px-6 py-10 shadow-[0_8px_40px_rgba(0,0,0,0.02)] sm:px-12 sm:py-14">
          <div className="space-y-6">
            <div className="h-7 w-28 animate-pulse rounded-full bg-zinc-100/80" />

            <div className="space-y-3">
              <div className="h-10 w-52 animate-pulse rounded-2xl bg-zinc-100/80 sm:h-12 sm:w-72" />
              <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-zinc-100/80" />
              <div className="h-4 w-3/4 max-w-lg animate-pulse rounded-full bg-zinc-100/80" />
            </div>
            
            <div className="flex gap-3 pt-2">
               <div className="h-8 w-32 animate-pulse rounded-full bg-zinc-100/80" />
               <div className="h-8 w-40 animate-pulse rounded-full bg-zinc-100/80" />
            </div>
          </div>
        </section>

        {/* 列表加载骨架 - 与最新版 ToolCard 完美对齐 */}
        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between px-2">
            <div className="space-y-2">
              <div className="h-7 w-32 animate-pulse rounded-xl bg-zinc-100/80" />
              <div className="h-4 w-64 animate-pulse rounded-full bg-zinc-100/80" />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex h-full flex-col overflow-hidden rounded-[28px] border border-black/[0.03] bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="h-[52px] w-[52px] shrink-0 animate-pulse rounded-[16px] bg-zinc-100/80" />
                  
                  <div className="min-w-0 flex-1 space-y-2.5 pt-1">
                    <div className="h-5 w-32 animate-pulse rounded-lg bg-zinc-100/80" />
                    <div className="h-4 w-20 animate-pulse rounded-md bg-zinc-100/80" />
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  <div className="h-3.5 w-full animate-pulse rounded-full bg-zinc-100/80" />
                  <div className="h-3.5 w-11/12 animate-pulse rounded-full bg-zinc-100/80" />
                  <div className="h-3.5 w-8/12 animate-pulse rounded-full bg-zinc-100/80" />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-100/80" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-100/80" />
                </div>
                
                <div className="mt-auto pt-6">
                   <div className="h-px w-full bg-zinc-100/50" />
                   <div className="mt-4 flex justify-between">
                     <div className="h-4 w-24 animate-pulse rounded-full bg-zinc-100/80" />
                     <div className="h-4 w-16 animate-pulse rounded-full bg-zinc-100/80" />
                   </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}