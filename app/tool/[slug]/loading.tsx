export default function ToolLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="space-y-8 sm:space-y-10">
        <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white px-5 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:rounded-[32px] sm:px-8 sm:py-10">
          <div className="space-y-5 sm:space-y-6">
            <div className="h-9 w-28 animate-pulse rounded-full bg-gray-100" />

            <div className="flex items-start justify-between gap-4 sm:gap-6">
              <div className="min-w-0 flex-1 space-y-4 sm:space-y-5">
                <div className="space-y-3">
                  <div className="h-10 w-48 animate-pulse rounded-2xl bg-gray-100 sm:h-12 sm:w-72" />
                  <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-gray-100" />
                  <div className="h-4 w-10/12 max-w-xl animate-pulse rounded-full bg-gray-100" />
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="h-9 w-28 animate-pulse rounded-full bg-gray-100" />
                  <div className="h-9 w-20 animate-pulse rounded-full bg-gray-100" />
                  <div className="h-9 w-20 animate-pulse rounded-full bg-gray-100" />
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <div className="h-11 w-28 animate-pulse rounded-full bg-gray-100" />
                  <div className="h-11 w-32 animate-pulse rounded-full bg-gray-100" />
                </div>
              </div>

              <div className="h-16 w-16 shrink-0 animate-pulse rounded-[22px] bg-gray-100 sm:h-20 sm:w-20 sm:rounded-[28px]" />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="h-7 w-24 animate-pulse rounded-2xl bg-gray-100" />
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-20 animate-pulse rounded-full bg-gray-100"
                />
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="h-7 w-24 animate-pulse rounded-2xl bg-gray-100" />
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded-full bg-gray-100" />
              <div className="h-4 w-11/12 animate-pulse rounded-full bg-gray-100" />
              <div className="h-4 w-10/12 animate-pulse rounded-full bg-gray-100" />
              <div className="h-4 w-9/12 animate-pulse rounded-full bg-gray-100" />
              <div className="h-4 w-8/12 animate-pulse rounded-full bg-gray-100" />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="h-7 w-24 animate-pulse rounded-2xl bg-gray-100" />
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <div className="h-3 w-16 animate-pulse rounded-full bg-gray-100" />
                <div className="mt-2 h-4 w-28 animate-pulse rounded-full bg-gray-100" />
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <div className="h-3 w-16 animate-pulse rounded-full bg-gray-100" />
                <div className="mt-2 h-4 w-28 animate-pulse rounded-full bg-gray-100" />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="h-8 w-28 animate-pulse rounded-2xl bg-gray-100" />

          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-5 w-32 animate-pulse rounded-xl bg-gray-100" />
                    <div className="h-4 w-full animate-pulse rounded-full bg-gray-100" />
                    <div className="h-4 w-8/12 animate-pulse rounded-full bg-gray-100" />
                    <div className="mt-3 h-4 w-20 animate-pulse rounded-full bg-gray-100" />
                  </div>

                  <div className="h-10 w-10 animate-pulse rounded-2xl bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}