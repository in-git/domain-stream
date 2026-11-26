/** 仪表盘加载中的骨架屏，保持与真实布局一致避免跳动 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
        <div className="h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
        <div className="h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
        <div className="h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
      </div>
    </div>
  );
}
