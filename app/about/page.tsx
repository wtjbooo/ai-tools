import Link from "next/link";
import type { Metadata } from "next";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

export const metadata: Metadata = {
  title: "关于我们",
  description:
    "了解 AI 工具目录的定位、收录方向与站点目标，帮助你更高效发现值得关注的 AI 工具。",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
  openGraph: {
    title: "关于我们 | AI 工具目录",
    description:
      "了解 AI 工具目录的定位、收录方向与站点目标，帮助你更高效发现值得关注的 AI 工具。",
    url: `${SITE_URL}/about`,
    siteName: "AI 工具目录",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "关于我们 | AI 工具目录",
    description:
      "了解 AI 工具目录的定位、收录方向与站点目标，帮助你更高效发现值得关注的 AI 工具。",
  },
};

const values = [
  {
    title: "更快找到合适工具",
    description:
      "我们希望把分散的 AI 工具信息收拢成更容易筛选和浏览的目录，而不是让用户到处零散搜索。",
  },
  {
    title: "保持目录长期可用",
    description:
      "相比短期堆量，我们更重视工具信息是否清晰、链接是否有效、分类是否合理，以及页面是否便于持续维护。",
  },
  {
    title: "兼顾发现效率与产品质感",
    description:
      "站点会尽量保持简洁、克制、偏高级感的浏览体验，不做过度拥挤和干扰式设计。",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-10">
        <section className="rounded-[30px] border border-gray-200 bg-white px-6 py-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:px-10 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
              About AI Tools Directory
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              关于我们
            </h1>

            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
              AI 工具目录是一个持续收录和整理 AI 工具的网站，目标不是简单堆砌链接，
              而是帮助用户更快找到适合自己场景的工具，并逐步建立更稳定的发现、筛选和比较体验。
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/featured"
                className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
              >
                浏览精选工具
              </Link>

              <Link
                href="/submit"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
              >
                提交工具
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {values.map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <h2 className="text-lg font-semibold tracking-tight text-gray-950">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">
              这个站点目前在做什么
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
              <p>
                当前站点已经完成了目录的基础结构，包括首页、分类页、搜索页、精选页、
                工具详情页和工具提交流程，也已经具备后台审核与基础统计能力。
              </p>
              <p>
                现阶段更重要的任务不是继续大幅重构，而是补足内容规模、完善 SEO、
                收口页面细节、建立更清晰的收录规则，并为正式运营与商业化测试做准备。
              </p>
              <p>
                如果你是工具开发者、独立开发者或产品团队，也欢迎通过提交工具或商务合作页面与我们建立联系。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">
              我们更希望它成为什么
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
              <p>
                我们希望它不只是一个“AI 工具列表”，而是一个能持续帮助用户发现新工具、
                快速完成初筛、并逐步形成可信推荐机制的目录型产品。
              </p>
              <p>
                后续会逐步补充更多高质量工具、专题内容、规则说明和合作入口，
                让这个站点从一个项目，真正走向一个可以持续运营的业务。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}