"use client";

import Link from "next/link";
import { useState } from "react";

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

function CopyEmailButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(BUSINESS_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      window.alert(`复制失败，请手动复制邮箱：${BUSINESS_EMAIL}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
    >
      {copied ? "已复制邮箱" : "复制邮箱"}
    </button>
  );
}

export default function BusinessPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-10">
        <section className="rounded-[30px] border border-gray-200 bg-white px-6 py-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:px-10 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
              Business & Partnerships
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              商务合作
            </h1>

            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
              AI 工具目录目前正处于正式运营前的收口阶段，欢迎与我们探索工具收录、精选推荐、
              专题合作、品牌曝光等合作方式。
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={`mailto:${BUSINESS_EMAIL}`}
                className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
              >
                邮件联系合作
              </a>

              <CopyEmailButton />

              <Link
                href="/submit"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
              >
                先提交工具
              </Link>
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

        <section className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            常见问题
          </h2>

          <div className="mt-6 space-y-6">
            {faqItems.map((item) => (
              <div
                key={item.q}
                className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0"
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
      </div>
    </div>
  );
}