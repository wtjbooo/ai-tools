import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-14">
      <section className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white px-5 py-10 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:rounded-[32px] sm:px-8 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.06),transparent_30%)]" />

        <div className="relative mx-auto max-w-2xl space-y-6">
          <div className="space-y-3">
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-gray-400">
              404
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              这个页面不存在
            </h1>
            <p className="text-sm leading-7 text-gray-600 sm:text-base">
              你访问的页面可能已经被删除、链接填写错误，或者暂时无法访问。
              可以返回首页继续浏览，也可以去搜索你想找的 AI 工具。
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
            >
              返回首页
            </Link>

            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
            >
              去搜索工具
            </Link>

            <Link
              href="/featured"
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
            >
              浏览精选推荐
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}