import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export default function PageHero({
  breadcrumbs,
  title,
  description,
  actions,
  compact = false,
}: {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-[0_10px_28px_rgba(0,0,0,0.04)] ${
        compact ? "px-5 py-5 sm:px-7 sm:py-6" : "px-5 py-6 sm:px-7 sm:py-7"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.06),transparent_30%)]" />

      <div className="relative space-y-3.5">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            {breadcrumbs.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                {index > 0 ? <span className="text-gray-300">/</span> : null}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-gray-950"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-[42px]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
      </div>
    </section>
  );
}