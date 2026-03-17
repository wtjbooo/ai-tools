import type { Metadata } from "next";
import Link from "next/link";
import BusinessContactActions from "@/components/BusinessContactActions";

const BUSINESS_EMAIL = "1966453336@qq.com";

const cooperationItems = [
  {
    title: "工具收录与完善",
    description:
      "适合希望补充工具资料、完善展示信息、提升页面完整度的团队或独立开发者。",
  },
  {
    title: "精选推荐与曝光",
    description:
      "适合希望获得首页、精选页或分类页更高曝光的产品团队，后续可结合站内数据逐步测试合作方式。",
  },
  {
    title: "专题与内容合作",
    description:
      "适合联合制作专题页、榜单、合集内容或品牌共建内容，用于提升工具发现效率与品牌触达。",
  },
  {
    title: "长期合作与赞助",
    description:
      "适合有持续品牌曝光需求的团队，后续可按分类、专题、内容栏目等方式探索合作。",
  },
];

const faqItems = [
  {
    q: "现在是否已经开放所有付费合作？",
    a: "目前站点仍处于收口与试运营准备阶段，商务合作会优先从精选曝光、内容合作、专题合作等轻量模式开始测试。",
  },
  {
    q: "是否保证推荐或排名结果？",
    a: "不会承诺影响站点自然排序或平台基础收录规则。推荐、展示和合作内容会尽量与站点整体体验保持一致。",
  },
  {
    q: "是否接受所有工具合作？",
    a: "不会。我们会优先考虑产品质量、工具完成度、页面信息完整度和是否适合目录用户的实际需求。",
  },
];

const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

export const metadata: Metadata = {
  title: "商务合作 - AI工具导航",
  description:
    "联系 AI工具导航 洽谈工具收录、精选推荐、专题合作、品牌曝光等商务合作方式。",
  alternates: {
    canonical: `${SITE_URL}/business`,
  },
  openGraph: {
    title: "商务合作 - AI工具导航",
    description:
      "联系 AI工具导航 洽谈工具收录、精选推荐、专题合作、品牌曝光等商务合作方式。",
    url: `${SITE_URL}/business`,
    siteName: "AI 工具导航",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "商务合作 - AI工具导航",
    description:
      "联系 AI工具导航 洽谈工具收录、精选推荐、专题合作、品牌曝光等商务合作方式。",
  },
};

export default function BusinessPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-6 py-10 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.10),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.08),transparent_26%)]" />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-500 backdrop-blur-md">
              Business & Partnerships
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              商务合作
            </h1>

            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
              AI 工具目录目前正处于正式运营前的收口阶段，欢迎与我们探索工具收录、精选推荐、
              专题合作、品牌曝光等合作方式。
            </p>

            <div className="mt-8">
              <BusinessContactActions email={BUSINESS_EMAIL} />
            </div>

            <p className="mt-4 text-xs text-gray-500 sm:text-sm">
              商务邮箱：{BUSINESS_EMAIL}
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {cooperationItems.map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-black/8 bg-white/92 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
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

        <section className="rounded-[24px] border border-black/8 bg-white/92 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-8">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">
              合作前说明
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
              <p>
                我们希望站点长期保持“对用户有用”的目录质量，因此合作展示会尽量与站点整体风格、
                分类逻辑和内容体验保持一致，不做过度打扰式设计。
              </p>
              <p>
                在站点正式开始商业化测试前，建议你先准备好产品名称、官网链接、产品简介、适用人群、
                核心场景、价格信息以及希望获得的合作目标，这会明显提升沟通效率。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-black/8 bg-white/92 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            常见问题
          </h2>

          <div className="mt-6 space-y-6">
            {faqItems.map((item) => (
              <div
                key={item.q}
                className="border-b border-black/6 pb-6 last:border-b-0 last:pb-0"
              >
                <h3 className="text-sm font-medium text-gray-950 sm:text-base">
                  {item.q}
                </h3>
                <p className="mt-2 text-sm leading-7 text-gray-600 sm:text-[15px]">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-black/8 bg-white/92 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                还没准备好商务合作？
              </h2>
              <p className="mt-2 text-sm leading-7 text-gray-600 sm:text-[15px]">
                你也可以先提交工具，我们会先按目录标准审核和整理内容。
              </p>
            </div>

            <Link
              href="/submit"
              className="inline-flex items-center justify-center rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-black/12 hover:bg-white hover:text-gray-950 active:scale-[0.98]"
            >
              先提交工具
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}