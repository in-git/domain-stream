import { useMemo, useState } from 'react';
import {
  Edit3,
  Film,
  LayoutGrid,
  List,
  Play,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { api } from '../../../lib/api.ts';
import { hasModulePerm } from '../../../lib/menu.ts';
import {
  formatDateShort,
  formatDuration,
  formatFileSize,
  formatNumber,
} from '../../../lib/format.ts';
import type { ContentStatus, VideoItem } from '../../../types/cms.ts';
import { publishCategoryName } from '../../../lib/category.ts';
import { usePublishCategories } from '../../../lib/usePublishCategories.ts';
import { MediaImage } from '../../../components/MediaImage.tsx';

interface VideoManagerViewProps {
  videos: VideoItem[];
  onRefresh: () => Promise<void>;
  onOpen: (action: 'new' | 'edit' | 'view' | 'delete', id?: string) => void;
  permissions?: string[];
}

export function VideoManagerView({
  videos,
  onRefresh,
  onOpen,
  permissions,
}: VideoManagerViewProps) {
  const canAdd = hasModulePerm('videos', 'Add', permissions);
  const canEdit = hasModulePerm('videos', 'Edit', permissions);
  const canDelete = hasModulePerm('videos', 'Delete', permissions);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { options: categoryOptions } = usePublishCategories('VIDEO');
  const categoryName = (code: string) => publishCategoryName(categoryOptions, code);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        categoryName(v.category).toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
      );
    });
  }, [videos, search, statusFilter, categoryOptions]);

  async function handleToggleStatus(item: VideoItem) {
    const nextStatus: ContentStatus = item.status === 'published' ? 'draft' : 'published';
    await api.updateVideo(item.id, { status: nextStatus });
    await onRefresh();
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-[320px]">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索视频标题或分类..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 transition-all"
            />
          </div>

          <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px]">
            {(
              [
                { key: 'all', label: '全部' },
                { key: 'published', label: '已发布' },
                { key: 'draft', label: '草稿' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1 text-[12px] font-medium rounded-[8px] transition-all whitespace-nowrap shrink-0 ${
                  statusFilter === tab.key
                    ? 'bg-white text-[#1D1D1F] shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="网格视图"
              className={`p-1.5 rounded-[8px] transition-colors ${
                viewMode === 'grid' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="列表视图"
              className={`p-1.5 rounded-[8px] transition-colors ${
                viewMode === 'list' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {canAdd && (
            <button
              type="button"
              onClick={() => onOpen('new')}
              className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>上传视频</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-16 px-6 text-center">
          <Film className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">暂无匹配的视频内容</h3>
          <p className="text-[13px] text-[#6E6E73] mt-1">
            拖拽 MP4、MOV 或 WebM 文件即可快速上传并自动生成视频封面
          </p>
          {canAdd && (
            <button
              type="button"
              onClick={() => onOpen('new')}
              className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              <span>立即上传首个视频</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col"
            >
              <div
                onClick={() => onOpen('view', item.id)}
                className="relative aspect-[2/1] bg-[#F2F2F7] overflow-hidden cursor-pointer group"
              >
                <MediaImage
                  src={item.coverUrl}
                  alt={item.title}
                  fallbackLabel={item.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#1D1D1F] shadow-md group-hover:scale-105 transition-transform">
                    <Play className="w-4 h-4 ml-0.5 fill-current" />
                  </div>
                </div>
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[12px] text-white/95 font-mono tabular-nums">
                  <span>{item.resolution}</span>
                  <span>{formatDuration(item.durationSec)}</span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-[12px] text-[#6E6E73] mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{categoryName(item.category)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatDateShort(item.updatedAt)}</span>
                    </div>
                    <span
                      className={`font-medium shrink-0 ${
                        item.status === 'published' ? 'text-[#16A34A]' : 'text-[#D97706]'
                      }`}
                    >
                      {item.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>

                  <h3
                    onClick={() => onOpen('view', item.id)}
                    className="text-[16px] font-semibold text-[#1D1D1F] leading-snug line-clamp-1 cursor-pointer hover:text-[#0071E3] transition-colors"
                  >
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[13px] text-[#6E6E73] line-clamp-2 leading-relaxed">
                    {item.description || '暂无视频简介说明'}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-[#F2F2F7] flex items-center justify-between gap-2">
                  <div className="text-[12px] text-[#86868B] tabular-nums">
                    {formatNumber(item.views)} 次播放 · {formatFileSize(item.fileSizeBytes)}
                  </div>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(item)}
                        className="px-2.5 py-1 rounded-lg text-[12px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                      >
                        {item.status === 'published' ? '转草稿' : '发布'}
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onOpen('edit', item.id)}
                        aria-label={`编辑 ${item.title}`}
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F5F5F7] transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onOpen('delete', item.id)}
                        aria-label={`删除 ${item.title}`}
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5EA] text-[12px] font-medium text-[#86868B]">
                  <th className="py-3 px-5">视频内容</th>
                  <th className="py-3 px-4">分类</th>
                  <th className="py-3 px-4">时长 / 画质</th>
                  <th className="py-3 px-4 text-right">播放量</th>
                  <th className="py-3 px-4">状态</th>
                  <th className="py-3 px-5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F7] text-[13px]">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F5F5F7]/60 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <button
                          type="button"
                          onClick={() => onOpen('view', item.id)}
                          className="relative w-20 h-11 rounded-lg overflow-hidden shrink-0 bg-[#F2F2F7] group"
                        >
                          <MediaImage
                            src={item.coverUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onOpen('view', item.id)}
                            className="font-medium text-[#1D1D1F] hover:text-[#0071E3] text-left truncate block max-w-[280px]"
                          >
                            {item.title}
                          </button>
                          <div className="text-[12px] text-[#86868B] tabular-nums">
                            {formatDateShort(item.updatedAt)} · {item.authorName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#6E6E73] whitespace-nowrap">
                      {categoryName(item.category)}
                    </td>
                    <td className="py-3 px-4 text-[#6E6E73] font-mono tabular-nums whitespace-nowrap">
                      {formatDuration(item.durationSec)} · {item.resolution}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[#1D1D1F] tabular-nums">
                      {formatNumber(item.views)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          item.status === 'published' ? 'text-[#16A34A]' : 'text-[#D97706]'
                        }`}
                      >
                        {item.status === 'published' ? '已发布' : '草稿'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onOpen('edit', item.id)}
                            className="px-2.5 py-1 rounded-lg text-[12px] text-[#0071E3] hover:bg-[#0071E3]/8 font-medium"
                          >
                            编辑
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => onOpen('delete', item.id)}
                            className="px-2.5 py-1 rounded-lg text-[12px] text-[#D70015] hover:bg-[#FF3B30]/8 font-medium"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
