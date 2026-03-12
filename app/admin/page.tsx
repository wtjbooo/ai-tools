"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type DashboardSummary = {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  publishedCount: number;
  hiddenCount: number;
  featuredCount: number;
  categoryCount: number;
  totalViews: number;
  totalOutClicks: number;
  totalHistoryClicks: number;
  todayViews: number;
  yesterdayViews: number;
  todayOutClicks: number;
  yesterdayOutClicks: number;
};

type RankedTool = {
  id: string;
  name: string;
  slug: string;
  views: number;
  outClicks: number;
  category: {
    name: string;
  } | null;
};

type RecentSubmission = {
  id: string;
  name: string;
  category: string;
  status: string;
  description: string;
  createdAt: string;
};

type TrendItem = {
  key: string;
  label: string;
  views: number;
  outClicks: number;
};

type DashboardResponse = {
  summary: DashboardSummary;
  topByViews: RankedTool[];
  topByOutClicks: RankedTool[];
  recentSubmissions: RecentSubmission[];
  trends: TrendItem[];
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

function SectionCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-gray-950">
          {title}
        </h2>
        {right ? <div className="text-sm">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

function getDeltaText(today: number, yesterday: number, unit: string) {
  const diff = today - yesterday;

  if (diff === 0) {
    return `较昨日持平（${yesterday}${unit}）`;
  }

  if (diff > 0) {
    return `较昨日 +${diff}${unit}（昨日 ${yesterday}${unit}）`;
  }

  return `较昨日 ${diff}${unit}（昨日 ${yesterday}${unit}）`;
}

function MiniBarChart({
  items,
  valueKey,
  emptyText,
}: {
  items: TrendItem[];
  valueKey: "views" | "outClicks";
  emptyText: string;
}) {
  if (items.length === 0) {
    return <div className="text-sm text-gray-500">{emptyText}</div>;
  }

  const maxValue = Math.max(...items.map((item) => item[valueKey]), 0);

  return (
    <div className="space-y-4">
      <div className="flex h-44 items-end gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 px-3 pb-3 pt-4">
        {items.map((item) => {
          const value = item[valueKey];
          const height =
            maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 10 : 2) : 2;

          return (
            <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
              <div className="text-xs font-medium text-gray-600">{value}</div>
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className="w-full max-w-[42px] rounded-t-xl bg-black/85 transition-all duration-300"
                  style={{ height: `${height}%` }}
                  title={`${item.label}: ${value}`}
                />
              </div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={`${item.key}-summary`}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            <div className="text-gray-500">{item.label}</div>
            <div className="mt-1 font-medium text-gray-950">{item[valueKey]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);

  async function fetchJson(url: string) {
    const res = await fetch(url, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function checkSessionAndLoad() {
    setChecking(true);
    setMsg(null);

    const dashboardReq = await fetchJson("/api/admin/dashboard");

    if (dashboardReq.res.status === 401 || dashboardReq.res.status === 403) {
      setLoggedIn(false);
      setChecking(false);
      return;
    }

    if (!dashboardReq.res.ok) {
      setMsg(dashboardReq.data?.error ?? "后台概览加载失败，请稍后重试");
      setLoggedIn(false);
      setChecking(false);
      return;
    }

    setDashboard(dashboardReq.data);
    setLoggedIn(true);
    setChecking(false);
  }

  async function reloadDashboard() {
    setLoadingDashboard(true);
    setMsg(null);

    const dashboardReq = await fetchJson("/api/admin/dashboard");

    if (dashboardReq.res.status === 401 || dashboardReq.res.status === 403) {
      setLoggedIn(false);
      setLoadingDashboard(false);
      return;
    }

    if (!dashboardReq.res.ok) {
      setMsg(dashboardReq.data?.error ?? "后台概览刷新失败，请稍后重试");
      setLoadingDashboard(false);
      return;
    }

    setDashboard(dashboardReq.data);
    setLoadingDashboard(false);
  }

  useEffect(() => {
    checkSessionAndLoad();
  }, []);

  async function login() {
    if (loggingIn) return;

    setLoggingIn(true);
    setMsg(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json().catch(() => ({}));

    setLoggingIn(false);

    if (!res.ok) {
      setMsg(data.error ?? "登录失败");
      return;
    }

    setPassword("");
    setLoggedIn(true);
    await reloadDashboard();
  }

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setMsg(null);

    const res = await fetch("/api/admin/logout", {
      method: "POST",
    });

    const data = await res.json().catch(() => ({}));

    setLoggingOut(false);

    if (!res.ok) {
      setMsg(data.error ?? "退出失败");
      return;
    }

    setLoggedIn(false);
    setDashboard(null);
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          正在检查后台登录状态...
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md p-6 space-y-4">
        <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
          <h1 className="text-3xl font-bold">后台登录</h1>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理员密码"
            className="w-full rounded-xl border px-3 py-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                login();
              }
            }}
          />

          <button
            onClick={login}
            disabled={loggingIn}
            className="rounded-xl border px-4 py-2 hover:shadow-sm disabled:opacity-60"
          >
            {loggingIn ? "登录中..." : "登录"}
          </button>

          {msg ? <p className="text-sm text-red-600">{msg}</p> : null}

          <Link className="underline text-sm block" href="/">
            ← 返回首页
          </Link>
        </div>
      </div>
    );
  }

  const summary = dashboard?.summary;
  const trends = dashboard?.trends ?? [];
  const topByViews = dashboard?.topByViews ?? [];
  const topByOutClicks = dashboard?.topByOutClicks ?? [];
  const recentSubmissions = dashboard?.recentSubmissions ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">后台概览</h1>
          <p className="text-sm text-gray-500">
            查看当前审核、工具收录与统计数据概况
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link className="underline text-sm" href="/admin/submissions">
            审核队列
          </Link>
          <Link className="underline text-sm" href="/admin/tools">
            工具管理
          </Link>
          <Link className="underline text-sm" href="/">
            返回首页
          </Link>
          <button
            onClick={reloadDashboard}
            disabled={loadingDashboard}
            className="rounded border px-3 py-1 text-sm disabled:opacity-60"
          >
            {loadingDashboard ? "刷新中..." : "刷新"}
          </button>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="rounded border px-3 py-1 text-sm disabled:opacity-60"
          >
            {loggingOut ? "退出中..." : "退出登录"}
          </button>
        </div>
      </div>

      {msg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {msg}
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="待审核" value={summary.pendingCount} />
            <StatCard label="已通过" value={summary.approvedCount} />
            <StatCard label="已拒绝" value={summary.rejectedCount} />
            <StatCard label="分类数" value={summary.categoryCount} />

            <StatCard
              label="已发布工具"
              value={summary.publishedCount}
              hint={`已隐藏 ${summary.hiddenCount}`}
            />
            <StatCard label="推荐工具" value={summary.featuredCount} />
            <StatCard label="总浏览" value={summary.totalViews} />
            <StatCard
              label="总官网点击"
              value={summary.totalOutClicks}
              hint={`历史点击 ${summary.totalHistoryClicks}`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="最近 7 天浏览趋势"
              right={
                <span className="text-xs text-gray-500">
                  {getDeltaText(summary.todayViews, summary.yesterdayViews, "")}
                </span>
              }
            >
              <MiniBarChart
                items={trends}
                valueKey="views"
                emptyText="暂时还没有浏览数据"
              />
            </SectionCard>

            <SectionCard
              title="最近 7 天官网点击趋势"
              right={
                <span className="text-xs text-gray-500">
                  {getDeltaText(
                    summary.todayOutClicks,
                    summary.yesterdayOutClicks,
                    ""
                  )}
                </span>
              }
            >
              <MiniBarChart
                items={trends}
                valueKey="outClicks"
                emptyText="暂时还没有官网点击数据"
              />
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="浏览最高工具"
              right={
                <Link href="/admin/tools" className="text-sm underline">
                  去工具管理
                </Link>
              }
            >
              {topByViews.length === 0 ? (
                <div className="text-sm text-gray-500">暂时还没有工具数据</div>
              ) : (
                <div className="space-y-3">
                  {topByViews.map((tool, index) => (
                    <div
                      key={tool.id}
                      className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-gray-500">#{index + 1}</div>
                        <div className="truncate font-medium text-gray-950">
                          {tool.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tool.category?.name ?? "未分类"}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-lg font-semibold text-gray-950">
                          {tool.views ?? 0}
                        </div>
                        <div className="text-xs text-gray-500">浏览</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="官网点击最高工具"
              right={
                <Link href="/admin/tools" className="text-sm underline">
                  去工具管理
                </Link>
              }
            >
              {topByOutClicks.length === 0 ? (
                <div className="text-sm text-gray-500">暂时还没有工具数据</div>
              ) : (
                <div className="space-y-3">
                  {topByOutClicks.map((tool, index) => (
                    <div
                      key={tool.id}
                      className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-gray-500">#{index + 1}</div>
                        <div className="truncate font-medium text-gray-950">
                          {tool.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tool.category?.name ?? "未分类"}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-lg font-semibold text-gray-950">
                          {tool.outClicks ?? 0}
                        </div>
                        <div className="text-xs text-gray-500">官网点击</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="最近提交"
            right={
              <Link href="/admin/submissions" className="text-sm underline">
                去审核队列
              </Link>
            }
          >
            {recentSubmissions.length === 0 ? (
              <div className="text-sm text-gray-500">最近没有提交记录</div>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-200 p-4 space-y-2"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-950">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          分类：{item.category || "未填写"} · 状态：{item.status}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleString("zh-CN")}
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 line-clamp-2">
                      {item.description || "暂无简介"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          后台概览暂时没有数据。
        </div>
      )}
    </div>
  );
}