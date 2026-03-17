import Link from "next/link";
import type { Metadata } from "next";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

export const metadata: Metadata = {
  title: "收录说明与审核规则",
  description:
    "AI 工具目录的收录说明、审核标准、重复处理、推荐规则与信息编辑原则，帮助提交者更高效完成投稿。",
  alternates: {
    canonical: `${SITE_URL}/guidelines`,
  },
  openGraph: {
    title: "收录说明与审核规则 | AI 工具目录",
    description:
      "查看 AI 工具目录的收录说明、审核标准、重复处理、推荐规则与信息编辑原则。",
    url: `${SITE_URL}/guidelines`,
    siteName: "AI 工具目录",
    locale: "zh_CN",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "收录说明与审核规则 | AI 工具目录",
    description:
      "查看 AI 工具目录的收录说明、审核标准、重复处理、推荐规则与信息编辑原则。",
  },
};

const includeRules = [
  "工具需有可访问的官网、产品页或可验证的公开页面。",
  "工具应具备明确用途，且和 AI、自动化、生成式能力或智能增强场景存在实际关联。",
  "工具名称、简介、官网链接、分类等基础信息需尽量完整，方便用户理解和筛选。",
  "优先收录已经具备可用产品形态的工具，而不是只有一句概念描述的空壳页面。",
];

const rejectRules = [
  "无法访问、长期失效、明显报错或内容空白的官网链接。",
  "重复提交同一工具，且缺少新的有效补充信息。",
  "信息严重不完整、描述失真、明显夸大，或难以判断产品真实定位。",
  "与站点方向明显无关，或当前阶段不适合面向目录用户展示的内容。",
];

const editRules = [
  "为了保持目录可读性，站点可能会对标题、简介、标签、分类进行适度编辑和规范化。",
  "若官网自动提取信息不完整，人工补充和修正会优先以用户理解成本更低为目标。",
  "编辑行为不会改变产品本身事实，但可能调整表达方式，以便统一目录信息口径。",
];

const duplicateRules = [
  "同域名、名称高度相近或实际指向同一产品的提交，通常会按重复处理。",
  "若同一产品存在多个页面入口，会优先保留更稳定、信息更完整的版本。",
  "重复提交并不一定会被直接拒绝；若补充信息更完整，也可能用于更新已有资料。",
];

const recommendationRules = [
  "推荐不只看是否提交，还会综合考虑产品完成度、信息完整度、用户价值与页面质量。",
  "被推荐不代表官方背书，也不意味着永久推荐；后续可根据内容质量和运营需要动态调整。",
  "合作展示与自然推荐会尽量保持站点整体体验一致，避免过度打扰式呈现。",
];

export default function GuidelinesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-10">
        <section className="rounded-[30px] border border-gray-200 bg-white px-6 py-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:px-10 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
              Submission Guidelines
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              收录说明与审核规则
            </h1>

            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
              这页用于说明 AI 工具目录当前阶段的收录标准、审核原则、重复处理方式与推荐口径，
              帮助提交者更高效地完成投稿，也帮助目录长期保持稳定质量。
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/submit"
                className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
              >
                提交工具
              </Link>

              <Link
                href="/business"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
              >
                商务合作
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h2 className="text-lg font-semibold tracking-tight text-gray-950">
              什么样的工具更适合被收录
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
              {includeRules.map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h2 className="text-lg font-semibold tracking-tight text-gray-950">
              常见不通过情况
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
              {rejectRules.map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            信息编辑原则
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
            {editRules.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h2 className="text-lg font-semibold tracking-tight text-gray-950">
              重复工具处理
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
              {duplicateRules.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h2 className="text-lg font-semibold tracking-tight text-gray-950">
              推荐与展示口径
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
              {recommendationRules.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">
              提交前建议准备的信息
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
              <p>为了提升审核效率，建议尽量准备完整的产品名称、官网链接、简介、分类建议、标签建议和价格信息。</p>
              <p>如果你的工具适合特定人群或明确场景，建议在简介里尽量写清楚“适合谁”和“解决什么问题”，这会明显提升页面质量。</p>
              <p>若提交后需要补充信息，后续也可以基于已有记录继续完善，而不是反复新建重复提交。</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}