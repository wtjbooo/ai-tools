import type { Metadata } from "next";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

export const metadata: Metadata = {
  title: "隐私政策",
  description:
    "了解 AI 工具目录如何处理站点访问、工具提交、基础统计与联系信息等相关数据。",
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
  openGraph: {
    title: "隐私政策 | AI 工具目录",
    description:
      "了解 AI 工具目录如何处理站点访问、工具提交、基础统计与联系信息等相关数据。",
    url: `${SITE_URL}/privacy`,
    siteName: "AI 工具目录",
    locale: "zh_CN",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "隐私政策 | AI 工具目录",
    description:
      "了解 AI 工具目录如何处理站点访问、工具提交、基础统计与联系信息等相关数据。",
  },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-8">
        <section className="rounded-[30px] border border-gray-200 bg-white px-6 py-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:px-10 sm:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
              Privacy Policy
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              隐私政策
            </h1>

            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
              本页面用于说明 AI 工具目录在站点访问、工具提交、基础统计、联系沟通等场景下，
              可能涉及的数据处理方式。随着站点功能调整，本页面内容也可能更新。
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            1. 我们可能收集哪些信息
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>当你浏览站点时，我们可能会记录基础访问数据，例如页面浏览、来源、设备环境或官网跳转行为，用于目录优化与基础统计分析。</p>
            <p>当你提交工具时，我们可能会处理你主动提供的信息，例如工具名称、官网链接、简介、分类建议、标签建议以及你填写的联系信息。</p>
            <p>当你通过邮件或其他方式联系站点时，我们也可能保存你主动提供的沟通内容，以便后续回复、审核或合作沟通。</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            2. 这些信息会被用于什么目的
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>这些信息主要用于维护目录内容、审核工具提交、优化页面体验、了解用户对工具的关注方向，以及改进站点整体运营效率。</p>
            <p>基础统计信息也可能用于判断哪些分类、工具或页面更值得继续完善，但不会用于向你提供与站点无关的骚扰式联系。</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            3. 关于工具提交与公开展示
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>当你主动提交工具时，提交内容中的部分信息可能会在审核通过后公开展示在站点页面中，例如工具名称、官网链接、简介、分类、标签和价格信息。</p>
            <p>为了保持目录信息统一，站点可能会对标题、简介、标签、分类等内容进行适度规范化处理，但不会故意歪曲产品事实。</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            4. 关于第三方链接
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>站点中会包含大量指向第三方工具官网的外部链接。点击这些链接后，你将离开本站并进入第三方网站。</p>
            <p>第三方网站的隐私政策、Cookie 使用方式和数据处理规则不受本站控制，建议你在访问相关网站时自行查看其对应政策说明。</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            5. 数据保存与安全
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>我们会尽量以合理方式保护站点运行过程中涉及的数据安全，但任何互联网服务都无法承诺绝对安全。</p>
            <p>对于非必要的信息，我们会尽量避免过度收集；对于必要的运营数据，我们会仅在目录维护、审核管理和站点优化范围内使用。</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            6. 政策更新
          </h2>
          <div className="space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            <p>随着站点功能、统计方式、提交机制或合作模式的变化，本隐私政策可能会更新。更新后的版本会发布在本页面，并自发布之日起生效。</p>
          </div>
        </section>
      </div>
    </div>
  );
}