export default function SkeletonLoader() {
  return (
    <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mt-8 animate-in fade-in duration-500">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col bg-white rounded-[24px] border border-black/[0.04] shadow-sm overflow-hidden h-[280px]">
          <div className="w-full h-[140px] bg-gray-100 animate-pulse"></div>
          <div className="p-5 flex flex-col gap-3">
            <div className="h-4 bg-gray-200 rounded-md w-3/4 animate-pulse"></div>
            <div className="h-3 bg-gray-100 rounded-md w-full animate-pulse"></div>
            <div className="h-3 bg-gray-100 rounded-md w-2/3 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}