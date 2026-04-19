import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import ToolViewTracker from "@/components/ToolViewTracker";
import CopyLinkButton from "@/components/CopyLinkButton";
import ReactMarkdown from "react-markdown";

"use client";
import { useState } from "react";

// --- 精美的 Tabs 选项卡组件 ---
function TabsLayout({
  contentParagraphs,
  tutorialContent,
  toolId,
}: {
  contentParagraphs: string[];
  tutorialContent?: string | null;
  toolId: string;
}) {
  const [activeTab, setActiveTab] = useState<"intro" | "tutorial">("intro");
  const hasTutorial = tutorialContent && tutorialContent.trim() !== "";

  return (
    <div className="space-y-6">
      {hasTutorial && (
        <div className="flex items-center gap-2 border-b border-black/[0.04] pb-px">
          <button
            onClick={() => setActiveTab("intro")}
            className={`relative pb-3 px-1 text-[16px] font-medium transition-colors ${
              activeTab === "intro" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            产品简介
            {activeTab === "intro" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-t-full" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("tutorial")}
            className={`relative pb-3 px-4 text-[16px] font-medium transition-colors ${
              activeTab === "tutorial" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            保姆级教程 ✨
            {activeTab === "tutorial" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-t-full" />
            )}
          </button>
        </div>
      )}

      <div className="min-h-[200px]">
        {/* 产品简介面板（也加上了 Markdown 翻译官） */}
        {activeTab === "intro" && (
          <div className="prose prose-zinc max-w-none text-[15px] leading-loose animate-in fade-in duration-500 prose-headings:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-500">
            <ReactMarkdown>{contentParagraphs.join('\n\n')}</ReactMarkdown>
          </div>
        )}

        {/* 使用教程面板 */}
        {activeTab === "tutorial" && hasTutorial && (
          <div className="prose prose-zinc max-w-none text-[15px] leading-loose animate-in fade-in duration-500 prose-headings:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-500">
            <ReactMarkdown>{tutorialContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

const SITE_NAME = "AI 工具目录";
const SITE_URL = process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

async function getPublishedToolBySlug(slug: string) {
  return prisma.tool.findFirst({
    where: { slug, isPublished: true },
    include: { category: true, tags: { include: { tag: true } } },
  });
}

async function getRelatedTools(categoryId: string, slug: string) {
  return prisma.tool.findMany({
    where: { categoryId, isPublished: true, NOT: { slug } },
    orderBy: [{ featured: "desc" }, { outClicks: "desc" }, { views: "desc" }, { clicks: "desc" }, { createdAt: "desc" }],
    take: 4,
    select: { id: true, name: true, slug: true, description: true, logoUrl: true },
  });
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function isWeakText(text?: string | null) {
  if (!text) return true;
  const value = text.trim();
  if (!value) return true;
  const weakPatterns = [/这里写/i, /待补充/i, /后续补充/i, /测试/i, /演示/i, /暂无简介/i];
  return weakPatterns.some((pattern) => pattern.test(value));
}

function normalizeDescription(toolName: string, categoryName: string, description?: string | null) {
  const fallback = `${toolName} 是一款归类在「${categoryName}」方向的 AI 工具，这里整理了它的定位、基础信息、标签与官网入口，方便你快速判断是否值得继续体验。`;
  const value = isWeakText(description) ? fallback : description!.trim();
  return truncateText(value, 160);
}

function buildKeywords(toolName: string, categoryName: string, tagNames: string[]) {
  return Array.from(new Set([toolName, categoryName, ...tagNames, `${toolName} 官网`, `${toolName} 介绍`, `${toolName} 怎么样`, `${toolName} 使用场景`, "AI 工具", "AI 工具目录", "AI工具导航"].filter(Boolean)));
}

function getPricingText(pricing?: string | null) {
  if (!pricing) return null;
  const value = pricing.trim();
  if (!value || value === "unknown" || value === "未知") return null;
  return value;
}

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("zh-CN");
}

function InfoBadge({ children, href }: { children: ReactNode; href?: string | null }) {
  const className = "inline-flex items-center rounded-full border border-zinc-200/60 bg-white/80 backdrop-blur-md px-3.5 py-1.5 text-[13px] font-medium text-zinc-700 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-zinc-950";
  if (href) return <Link href={href} className={className}>{children}</Link>;
  return <span className={className}>{children}</span>;
}

function DetailCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900">{title}</h2>
        {description ? <p className="text-[14px] leading-6 text-zinc-500">{description}</p> : null}
      </div>
      <div className="rounded-[28px] border border-black/[0.04] bg-white p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] sm:p-8">
        {children}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[20px] border border-black/[0.03] bg-zinc-50/50 px-4 py-4 transition-colors hover:bg-zinc-50">
      <div className="text-[12px] font-medium text-zinc-500">{label}</div>
      <div className="mt-1.5 text-[18px] font-semibold tracking-tight text-zinc-900">{value}</div>
    </div>
  );
}

function SoftList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item} className="rounded-[20px] border border-black/[0.03] bg-zinc-50/80 px-5 py-4 text-[14px] leading-7 text-zinc-700">{item}</div>
      ))}
    </div>
  );
}

function RelatedToolLink({ name, slug, description, logoUrl }: { name: string; slug: string; description?: string | null; logoUrl?: string | null }) {
  const relatedLogoSrc = logoUrl && logoUrl.trim() !== "" ? logoUrl : "/default-tool-icon.png";
  return (
    <Link href={`/tool/${slug}`} className="group block rounded-[24px] border border-black/[0.04] bg-white p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] transition-all duration-500 hover:-translate-y-1 hover:border-black/[0.08] hover:shadow-[0_14px_30px_-6px_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-3.5">
        <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-zinc-50 ring-1 ring-black/[0.04] transition-transform duration-500 group-hover:scale-105 group-hover:bg-white">
          <img src={relatedLogoSrc} alt={`${name} logo`} width={24} height={24} className="h-6 w-6 rounded-md object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="truncate text-[15px] font-semibold text-zinc-900 transition-colors group-hover:text-black">{name}</div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-zinc-500">{isWeakText(description) ? "查看这款同类 AI 工具的定位与详情。" : description}</p>
          <span className="mt-2.5 inline-flex items-center text-[12px] font-medium text-zinc-400 transition-colors group-hover:text-zinc-900">
            查看详情 <span className="ml-1 transition-transform duration-300 group-hover:translate-x-1">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function splitContentToParagraphs(content: string) {
  return content.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean).filter((item) => !isWeakText(item));
}

function buildUseCases(name: string, categoryName: string, tagList: string[], pricingText: string | null) {
  const items = [`想快速判断 ${name} 是否适合自己当前工作流的人`, `需要在「${categoryName}」场景中提升效率或生成质量的个人用户与团队`];
  if (tagList.length > 0) items.push(`关注 ${tagList.slice(0, 3).join("、")} 等能力方向的用户`);
  if (pricingText) items.push(`希望先结合价格方式与能力定位，再决定是否深入试用的人`);
  return items.slice(0, 4);
}

function buildFallbackParagraphs(name: string, categoryName: string, tagList: string[], pricingText: string | null) {
  const tagText = tagList.length > 0 ? `，并与 ${tagList.slice(0, 3).join("、")} 等标签相关` : "";
  const pricingSentence = pricingText ? `当前页面也整理了它的价格方式：${pricingText}。` : "当前页面整理了它的分类、标签和访问入口，方便快速判断是否值得继续了解。";
  return [`${name} 是一款归类在「${categoryName}」方向的 AI 工具${tagText}。如果你正在寻找这一类产品，这个页面可以先帮你快速了解它的大致定位。`, pricingSentence];
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const tool = await getPublishedToolBySlug(params.slug);
  if (!tool) return { title: "工具不存在", description: "页面不存在", robots: { index: false, follow: false } };
  const tagNames = tool.tags.map((item) => item.tag.name).filter(Boolean);
  const categoryName = tool.category?.name || "AI 工具";
  const url = `${SITE_URL}/tool/${tool.slug}`;
  const description = normalizeDescription(tool.name, categoryName, tool.description);
  return {
    title: `${tool.name} - ${categoryName}`, description, keywords: buildKeywords(tool.name, categoryName, tagNames), alternates: { canonical: url },
    openGraph: { title: `${tool.name} - ${categoryName}`, description, url, siteName: SITE_NAME, type: "article", locale: "zh_CN" },
    twitter: { card: "summary_large_image", title: `${tool.name} - ${categoryName}`, description }, robots: { index: true, follow: true }
  };
}

export default async function ToolPage({ params }: { params: { slug: string } }) {
  const tool = await getPublishedToolBySlug(params.slug);
  if (!tool) notFound();
  const relatedTools = tool.categoryId ? await getRelatedTools(tool.categoryId, tool.slug) : [];
  const pricingText = getPricingText(tool.pricing);
  const tagList = tool.tags.map((item) => item.tag.name).filter(Boolean);
  const categoryName = tool.category?.name || "AI 工具";
  const categoryHref = tool.category?.slug ? `/category/${encodeURIComponent(tool.category.slug)}` : null;
  const url = `${SITE_URL}/tool/${tool.slug}`;
  const outHref = `/out/${tool.slug}`;
  const secondaryHref = categoryHref || "/featured";
  const secondaryLabel = categoryHref ? `更多 ${categoryName}` : "浏览精选工具";
  const normalizedDescription = normalizeDescription(tool.name, categoryName, tool.description);
  const paragraphs = tool.content?.trim() ? splitContentToParagraphs(tool.content) : [];
  const finalParagraphs = paragraphs.length > 0 ? paragraphs : buildFallbackParagraphs(tool.name, categoryName, tagList, pricingText);
  const useCases = buildUseCases(tool.name, categoryName, tagList, pricingText);
  const logoSrc = tool.logoUrl && tool.logoUrl.trim() !== "" ? tool.logoUrl : "/default-tool-icon.png";

  return (
    <>
      <ToolViewTracker slug={tool.slug} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="space-y-8">
          <section className="relative overflow-hidden rounded-[32px] border border-black/[0.04] bg-white px-6 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.06),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.04),transparent_40%)]" />
            <div className="relative space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/" className="inline-flex items-center rounded-full border border-black/[0.06] bg-white px-4 py-2 text-[13px] font-medium text-zinc-600 transition hover:-translate-y-0.5 hover:text-zinc-900 shadow-sm">← 返回首页</Link>
                {categoryHref ? <Link href={categoryHref} className="inline-flex items-center rounded-full px-3 py-2 text-[13px] font-medium text-zinc-500 transition hover:bg-zinc-50">{categoryName}</Link> : null}
              </div>
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),280px] lg:items-start pt-2">
                <div className="min-w-0 space-y-5">
                  <h1 className="text-[36px] font-bold tracking-tight text-zinc-900 sm:text-[48px]">{tool.name}</h1>
                  <p className="max-w-3xl text-[16px] leading-relaxed text-zinc-500 sm:text-[18px]">{normalizedDescription}</p>
                  <div className="flex flex-wrap gap-2.5">
                    <InfoBadge href={categoryHref}>主分类：{categoryName}</InfoBadge>
                    {pricingText ? <InfoBadge>价格：{pricingText}</InfoBadge> : null}
                    {tagList.slice(0, 3).map((tag) => <InfoBadge key={tag}>{tag}</InfoBadge>)}
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                    {tool.website ? <a href={outHref} target="_blank" className="inline-flex items-center rounded-full bg-zinc-900 px-6 py-3 text-[14px] font-medium text-white transition hover:bg-black">访问官网体验</a> : <span className="inline-flex items-center rounded-full border px-6 py-3 text-[14px] font-medium text-zinc-400">暂未提供官网</span>}
                    <CopyLinkButton url={url} />
                    <Link href={secondaryHref} className="inline-flex items-center rounded-full border bg-white px-6 py-3 text-[14px] font-medium text-zinc-700 hover:bg-zinc-50">{secondaryLabel}</Link>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <img src={logoSrc} alt="logo" className="h-12 w-12 rounded-[12px] object-cover ring-1 ring-black/[0.04]" />
                      <div className="min-w-0">
                        <div className="truncate text-[18px] font-bold text-zinc-900">{tool.name}</div>
                        <div className="text-[13px] text-zinc-500">{categoryName}</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="总计浏览" value={tool.views ?? 0} />
                    <StatCard label="前往官网" value={tool.outClicks ?? 0} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr),320px]">
            <div className="space-y-8">
              {/* 这里调用 TabsLayout，标题也改为了产品介绍 */}
              <DetailCard title="产品介绍">
                <TabsLayout contentParagraphs={finalParagraphs} tutorialContent={tool.tutorial} toolId={tool.id} />
              </DetailCard>

              <DetailCard title="适合人群与场景" description="看看这款产品是否契合你的日常工作流。"><SoftList items={useCases} /></DetailCard>
              {tagList.length > 0 ? <DetailCard title="功能标签" description="通过标签快速掌握产品的亮点。"><div className="flex flex-wrap gap-2.5">{tagList.map((tag) => <span key={tag} className="inline-flex items-center rounded-full bg-zinc-50 px-3.5 py-1.5 text-[13px] font-medium text-zinc-600">{tag}</span>)}</div></DetailCard> : null}
            </div>

            <aside className="space-y-6 sticky top-24 self-start">
              <DetailCard title="准备出发" description="直接点击前往体验这款产品的魅力。">
                <div className="space-y-4">
                  {tool.website ? <a href={outHref} target="_blank" className="flex w-full items-center justify-center rounded-[20px] bg-zinc-900 px-5 py-3.5 text-[15px] font-semibold text-white">直达官网体验</a> : <div className="rounded-[20px] border px-4 py-3.5 text-center text-sm text-zinc-400">暂未提供官网链接</div>}
                </div>
              </DetailCard>
              {relatedTools.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="text-[18px] font-semibold text-zinc-900">替代方案推荐</h2>
                  <div className="space-y-3">{relatedTools.map((t) => <RelatedToolLink key={t.id} name={t.name} slug={t.slug} description={t.description} logoUrl={t.logoUrl} />)}</div>
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}