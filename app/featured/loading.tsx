export default function FeaturedLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="space-y-6 sm:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white px-5 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:rounded-[32px] sm:px-8 sm:py-10">
          <div className="space-y-4">
            <div className="h-9 w-28 animate-pulse rounded-full bg-gray-100" />

            <div className="space-y-2">
              <div className="h-10 w-40 animate-pulse rounded-2xl bg-gray-100 sm:h-12 sm:w-52" />
              <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-gray-100" />
              <div className="h-4 w-72 animate-pulse rounded-full bg-gray-100" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-24 animate-pulse rounded-full bg-gray-100"
              />
            ))}
          </div>
        </section>

        <section>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[22px] border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:rounded-[24px] sm:p-5"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-5 w-32 animate-pulse rounded-xl bg-gray-100" />
                      <div className="h-4 w-20 animate-pulse rounded-full bg-gray-100" />
                    </div>

                    <div className="h-9 w-9 animate-pulse rounded-2xl bg-gray-100 sm:h-10 sm:w-10" />
                  </div>

                  <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded-full bg-gray-100" />
                    <div className="h-4 w-11/12 animate-pulse rounded-full bg-gray-100" />
                    <div className="h-4 w-8/12 animate-pulse rounded-full bg-gray-100" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="h-7 w-20 animate-pulse rounded-full bg-gray-100" />
                    <div className="h-7 w-16 animate-pulse rounded-full bg-gray-100" />
                    <div className="h-7 w-14 animate-pulse rounded-full bg-gray-100" />
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