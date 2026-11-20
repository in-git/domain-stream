/** 仪表盘加载中的骨架屏，保持与真实布局一致避免跳动 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-[132px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        <div className="lg:col-span-2 xl:col-span-3 h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
        <div className="lg:col-span-1 xl:col-span-2 h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
        <div className="h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
      </div>
    </div>
  );
}
