export default function ToolLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        <section className="overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] px-5 py-6 shadow-[0_20px_64px_rgba(15,23,42,0.075)] sm:px-8 sm:py-8">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <div className="h-10 w-28 animate-pulse rounded-full bg-gray-100" />
              <div className="h-10 w-24 animate-pulse rounded-full bg-gray-100" />
            </div>

            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr),300px] lg:items-start">
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="h-7 w-36 animate-pulse rounded-full bg-gray-100" />
                  <div className="h-12 w-56 animate-pulse rounded-2xl bg-gray-100 sm:w-80" />
                  <div className="h-5 w-full max-w-3xl animate-pulse rounded-full bg-gray-100" />
                  <div className="h-5 w-10/12 max-w-2xl animate-pulse rounded-full bg-gray-100" />
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="h-9 w-28 animate-pulse rounded-full bg-gray-100" />
                  <div className="h-9 w-24 animate-pulse rounded-full bg-gray-100" />
                  <div className="h-9 w-20 animate-pulse rounded-full bg-gray-100" />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-16 animate-pulse rounded-full bg-gray-100"
                    />
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <div className="h-11 w-28 animate-pulse rounded-full bg-gray-100" />
                  <div className="h-11 w-28 animate-pulse rounded-full bg-gray-100" />
                  <div className="h-11 w-32 animate-pulse rounded-full bg-gray-100" />
                </div>

                <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-gray-100" />
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-black/8 bg-white/80 p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 animate-pulse rounded-[24px] bg-gray-100" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-5 w-28 animate-pulse rounded-xl bg-gray-100" />
                      <div className="h-4 w-20 animate-pulse rounded-full bg-gray-100" />
                      <div className="h-4 w-24 animate-pulse rounded-full bg-gray-100" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-[24px] border border-black/8 bg-white/88 px-4 py-4"
                    >
                      <div className="h-3 w-12 animate-pulse rounded-full bg-gray-100" />
                      <div className="mt-2 h-6 w-16 animate-pulse rounded-xl bg-gray-100" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr),340px]">
          <div className="space-y-8">
            {Array.from({ length: 4 }).map((_, sectionIndex) => (
              <section key={sectionIndex} className="space-y-3">
                <div className="space-y-2">
                  <div className="h-7 w-28 animate-pulse rounded-2xl bg-gray-100" />
                  <div className="h-4 w-56 animate-pulse rounded-full bg-gray-100" />
                </div>

                <div className="rounded-[30px] border border-black/8 bg-white/92 p-6 sm:p-7">
                  <div className="space-y-3">
                    <div className="h-4 w-full animate-pulse rounded-full bg-gray-100" />
                    <div className="h-4 w-11/12 animate-pulse rounded-full bg-gray-100" />
                    <div className="h-4 w-10/12 animate-pulse rounded-full bg-gray-100" />
                    <div className="h-4 w-9/12 animate-pulse rounded-full bg-gray-100" />
                  </div>
                </div>
              </section>
            ))}
          </div>

          <aside className="space-y-6">
            <section className="space-y-3">
              <div className="space-y-2">
                <div className="h-7 w-24 animate-pulse rounded-2xl bg-gray-100" />
                <div className="h-4 w-52 animate-pulse rounded-full bg-gray-100" />
              </div>

              <div className="rounded-[30px] border border-black/8 bg-white/92 p-6 sm:p-7">
                <div className="space-y-4">
                  <div className="h-12 w-full animate-pulse rounded-[22px] bg-gray-100" />
                  <div className="h-12 w-full animate-pulse rounded-[22px] bg-gray-100" />
                  <div className="h-24 w-full animate-pulse rounded-[22px] bg-gray-100" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-2">
                <div className="h-7 w-24 animate-pulse rounded-2xl bg-gray-100" />
                <div className="h-4 w-64 animate-pulse rounded-full bg-gray-100" />
              </div>

              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-[24px] border border-black/8 bg-white/92 p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 animate-pulse rounded-[18px] bg-gray-100" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-5 w-28 animate-pulse rounded-xl bg-gray-100" />
                        <div className="h-4 w-full animate-pulse rounded-full bg-gray-100" />
                        <div className="h-4 w-8/12 animate-pulse rounded-full bg-gray-100" />
                        <div className="h-4 w-16 animate-pulse rounded-full bg-gray-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}