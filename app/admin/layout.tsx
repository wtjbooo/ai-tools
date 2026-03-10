export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen">
      {isDev ? (
        <div className="border-b border-red-200 bg-red-50">
          <div className="mx-auto max-w-7xl px-4 py-3 text-sm text-red-900 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                  后台高风险提醒
                </span>
                <span className="leading-6">
                  当前为本地开发环境，且你已经确认连接的是正式数据库。这里的通过、拒绝、编辑、隐藏、推荐等操作都会直接影响线上正式数据。
                </span>
              </div>
              <span className="text-xs text-red-700 sm:text-sm">
                请把这里当成正式后台使用
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
}