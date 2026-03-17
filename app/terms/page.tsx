import type { Metadata } from "next";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

export const metadata: Metadata = {
  title: "服务条款",
  description:
    "了解使用 AI 工具目录时的基础规则，包括工具收录、内容展示、外部链接与责任说明等。",
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
  openGraph: {
    title: "服务条款 | AI 工具目录",
    description:
      "了解使用 AI 工具目录时的基础规则，包括工具收录、内容展示、外部链接与责任说明等。",
    url: `${SITE_URL}/terms`,
    siteName: "AI 工具目录",
    locale: "zh_CN",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "服务条款 | AI 工具目录",
    description:
      "了解使用 AI 工具目录时的基础规则，包括工具收录、内容展示、外部链接与责任说明等。",
  },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-8">
        <section className="rounded-[30px] border border-gray-200 bg-white px-6 py-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:px-10 sm:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
              Terms of Service
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              服务条款
            </h1>

            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
              本页面用于说明使用 AI 工具目录时的基础规则。访问、浏览、提交工具或通过本站访问第三方工具，
              即表示你理解并接受这些基础条款。
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            1. 站点定位
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>AI 工具目录是一个用于收录、整理、展示和发现 AI 工具的信息平台，主要帮助用户更快浏览、筛选和初步了解不同工具。</p>
            <p>本站提供的是目录信息与发现入口，不构成对任何第三方工具的投资、法律、医疗、财务或其他专业建议。</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            2. 关于工具信息展示
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>站点中的工具名称、简介、标签、分类、价格信息和官网链接，可能来自公开信息、工具方提交或站点整理。</p>
            <p>我们会尽量保持信息准确，但不承诺所有内容始终完整、最新或绝对无误。你在使用任何第三方工具前，仍应自行判断并核实。</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            3. 关于提交工具
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>当你提交工具时，默认你有权提供相关信息，并确认你提交的内容不侵犯他人权利，也不包含明显虚假、误导或违法内容。</p>
            <p>站点保留对提交内容进行审核、编辑、发布、拒绝、隐藏、调整展示位置或后续下线的权利，以维护目录质量和用户体验。</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            4. 关于外部链接与第三方服务
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>本站会提供大量前往第三方网站的外部链接。点击这些链接后，相关服务不再由本站控制。</p>
            <p>对于第三方产品的可用性、合法性、定价、服务质量、内容更新或后续风险，本站不作保证，也不承担由此产生的直接或间接责任。</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            5. 关于推荐与合作展示
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>站点中的推荐、精选、热门、最新等展示形式，可能基于编辑判断、内容质量、数据表现或后续合作安排综合决定。</p>
            <p>被收录、被推荐或被展示，并不构成对相关产品的绝对背书，也不代表永久维持当前展示状态。</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            6. 条款变更
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>随着站点运营、合作模式或功能结构的调整，本服务条款可能会更新。更新后的版本会发布在本页面，并自发布之日起生效。</p>
          </div>
        </section>
      </div>
    </div>
  );
}