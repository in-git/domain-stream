import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  ImagePlus,
  Images,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../../../lib/api.ts';
import { hasModulePerm } from '../../../lib/menu.ts';
import { formatDateShort, formatNumber } from '../../../lib/format.ts';
import type { ContentStatus, ImageTextItem } from '../../../types/cms.ts';
import { publishCategoryName } from '../../../lib/category.ts';
import { usePublishCategories } from '../../../lib/usePublishCategories.ts';
import { MediaImage } from '../../../components/MediaImage.tsx';

interface ImageTextManagerViewProps {
  items: ImageTextItem[];
  onRefresh: () => Promise<void>;
  onOpen: (action: 'new' | 'edit' | 'view' | 'delete', id?: string, slide?: number) => void;
  permissions?: string[];
}

interface ImageTextCardProps {
  item: ImageTextItem;
  categoryLabel: string;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: ImageTextManagerViewProps['onOpen'];
  onToggleStatus: () => void;
}

/** 图文卡片：封面多图轮播，点击封面进入对应幻灯片的查看页 */
function ImageTextCard({
  item,
  categoryLabel,
  canEdit,
  canDelete,
  onOpen,
  onToggleStatus,
}: ImageTextCardProps) {
  const [active, setActive] = useState(0);
  const total = item.images.length;
  const current = item.images[Math.min(active, Math.max(total - 1, 0))];

  const go = (delta: number) => {
    if (total < 2) return;
    setActive((idx) => (idx + delta + total) % total);
  };

  return (
    <article className="bg-white rounded-[16px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col">
      <div
        onClick={() => onOpen('view', item.id, active)}
        className="relative aspect-[4/3] bg-[#F2F2F7] overflow-hidden cursor-pointer group"
      >
        <MediaImage
          src={current}
          alt={item.title}
          fallbackLabel={item.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

        {total > 1 && (
          <>
            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-md text-[11px] font-medium text-white tabular-nums">
              {Math.min(active + 1, total)} / {total}
            </div>
            <button
              type="button"
              aria-label="上一张"
              onClick={(event) => {
                event.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white flex items-center justify-center opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={(event) => {
                event.stopPropagation();
                go(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white flex items-center justify-center opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 text-[12px] text-[#6E6E73]">
          <div className="flex items-center gap-1.5 truncate">
            <span className="truncate">{categoryLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums shrink-0">{formatDateShort(item.updatedAt)}</span>
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
          onClick={() => onOpen('view', item.id, active)}
          className="mt-1 text-[15px] font-semibold text-[#1D1D1F] leading-snug line-clamp-1 cursor-pointer hover:text-[#0071E3] transition-colors"
        >
          {item.title}
        </h3>
        <p className="mt-1 text-[12px] text-[#6E6E73] line-clamp-1 leading-relaxed">
          {item.body || '暂无图文配文描述'}
        </p>

        <div className="mt-auto pt-3 flex items-center justify-between gap-2 text-[12px] text-[#86868B]">
          <span className="tabular-nums truncate">
            {formatNumber(item.views)} 次浏览 · {formatNumber(item.likes)} 赞
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={onToggleStatus}
                className="px-2 py-1 rounded-lg text-[12px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
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
  );
}

export function ImageTextManagerView({
  items,
  onRefresh,
  onOpen,
  permissions,
}: ImageTextManagerViewProps) {
  const canAdd = hasModulePerm('imagetexts', 'Add', permissions);
  const canEdit = hasModulePerm('imagetexts', 'Edit', permissions);
  const canDelete = hasModulePerm('imagetexts', 'Delete', permissions);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');
  const { options: categoryOptions } = usePublishCategories('GRAPHIC');
  const categoryName = (code: string) => publishCategoryName(categoryOptions, code);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter !== 'all' && it.status !== statusFilter) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        it.body.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q) ||
        categoryName(it.category).toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter, categoryOptions]);

  async function handleToggleStatus(item: ImageTextItem) {
    const nextStatus: ContentStatus = item.status === 'published' ? 'draft' : 'published';
    await api.updateImageText(item.id, { status: nextStatus });
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
              placeholder="搜索图文标题、正文或分类..."
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

        {canAdd && (
          <button
            type="button"
            onClick={() => onOpen('new')}
            className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>发布图文</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-16 px-6 text-center">
          <Images className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">暂无图文作品</h3>
          <p className="text-[13px] text-[#6E6E73] mt-1">
            一次拖入多张高清图片，自由调整排序并设为封面即可发布
          </p>
          {canAdd && (
            <button
              type="button"
              onClick={() => onOpen('new')}
              className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
            >
              <ImagePlus className="w-4 h-4" />
              <span>创建第一篇图文</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <ImageTextCard
              key={item.id}
              item={item}
              categoryLabel={categoryName(item.category)}
              canEdit={canEdit}
              canDelete={canDelete}
              onOpen={onOpen}
              onToggleStatus={() => void handleToggleStatus(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
