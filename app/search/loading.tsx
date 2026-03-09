export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white px-5 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:rounded-[32px] sm:px-8 sm:py-10">
          <div className="space-y-4">
            <div className="h-9 w-28 animate-pulse rounded-full bg-gray-100" />

            <div className="space-y-2">
              <div className="h-10 w-40 animate-pulse rounded-2xl bg-gray-100 sm:h-12 sm:w-52" />
              <div className="h-4 w-72 animate-pulse rounded-full bg-gray-100" />
            </div>

            <div className="max-w-4xl">
              <div className="rounded-[24px] border border-gray-200 bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:rounded-[28px]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="h-[52px] flex-1 animate-pulse rounded-[18px] bg-gray-100" />
                  <div className="h-[52px] w-full animate-pulse rounded-[18px] bg-gray-100 sm:w-28" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-5 w-32 animate-pulse rounded-xl bg-gray-100" />
                      <div className="h-4 w-20 animate-pulse rounded-full bg-gray-100" />
                    </div>

                    <div className="h-10 w-10 animate-pulse rounded-2xl bg-gray-100" />
                  </div>

                  <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded-full bg-gray-100" />
                    <div className="h-4 w-11/12 animate-pulse rounded-full bg-gray-100" />
                    <div className="h-4 w-8/12 animate-pulse rounded-full bg-gray-100" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="h-7 w-16 animate-pulse rounded-full bg-gray-100" />
                    <div className="h-7 w-20 animate-pulse rounded-full bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}