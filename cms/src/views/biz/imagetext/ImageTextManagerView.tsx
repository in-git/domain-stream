import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Heart,
  ImagePlus,
  Images,
  Plus,
  Search,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../../lib/api.ts';
import { DeleteConfirmModal } from '../../../components/DeleteConfirmModal.tsx';
import { SortOrderButton } from '../../../components/SortOrderButton.tsx';
import type { GraphicPageQuery } from '../../../lib/snowy.ts';
import { hasModulePerm } from '../../../lib/menu.ts';
import { formatDateShort, formatNumber } from '../../../lib/format.ts';
import type { ContentStatus, ImageTextItem } from '../../../types/cms.ts';
import { publishCategoryName } from '../../../lib/category.ts';
import { usePublishCategories } from '../../../lib/usePublishCategories.ts';
import { MediaImage } from '../../../components/MediaImage.tsx';

interface ImageTextManagerViewProps {
  items: ImageTextItem[];
  query: GraphicPageQuery;
  loading: boolean;
  onQueryChange: (query: GraphicPageQuery) => void;
  onRefresh: () => Promise<void>;
  onOpen: (action: 'new' | 'edit' | 'view' | 'delete', id?: string, slide?: number) => void;
  permissions?: string[];
}

interface ImageTextCardProps {
  item: ImageTextItem;
  canEdit: boolean;
  canDelete: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRequestDelete: (item: ImageTextItem) => void;
  onOpen: ImageTextManagerViewProps['onOpen'];
  onToggleStatus: () => void;
}

/** 图文卡片：与客户端 NoteCard 同款，封面多图轮播 + 图上标题/配文/点赞 */
function ImageTextCard({
  item,
  canEdit,
  canDelete,
  selected,
  onToggleSelect,
  onRequestDelete,
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

  // 与客户端 NoteCard 完全一致的结构与尺寸：只有一张图 + 图上文字
  return (
    <article className="group mb-2 break-inside-avoid">
      <div
        onClick={() => onOpen('view', item.id, active)}
        className="relative w-full cursor-pointer overflow-hidden rounded-lg bg-[#F5F5F7] dark:bg-[#1C1C1E]"
        style={{ aspectRatio: '3 / 4' }}
      >
        <MediaImage
          src={current}
          alt={item.title}
          fallbackLabel={item.title}
          className="w-full h-full object-cover select-none"
        />

        {/* 单选复选框：左上角，点击不触发卡片打开 */}
        {canDelete && (
          <button
            type="button"
            aria-label={selected ? `取消选择 ${item.title}` : `选择 ${item.title}`}
            aria-pressed={selected}
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect(item.id);
            }}
            className={`absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border shadow-sm backdrop-blur-sm transition-colors ${
              selected
                ? 'border-[#0071E3] bg-[#0071E3] text-white'
                : 'border-white/70 bg-black/35 text-transparent hover:bg-black/55'
            }`}
          >
            {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : <Square className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* 多图角标：右上角「1/3」 */}
        {total > 1 && (
          <>
            <span className="absolute right-2 top-2 rounded-full bg-black/40 px-1.5 py-[1px] text-[10px] font-medium text-white backdrop-blur-sm tabular-nums">
              {active + 1}/{total}
            </span>
            <button
              type="button"
              aria-label="上一张"
              onClick={(event) => {
                event.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={(event) => {
                event.stopPropagation();
                go(1);
              }}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* 图片底部压暗：让覆盖在图片上的标题与点赞始终清晰 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        {/* 标题 + 配文：左下角，标题更大，配文紧贴其下 */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 pr-9">
          <p className="line-clamp-2 text-[15px] font-semibold leading-[1.35] text-white drop-shadow-sm">
            {item.title}
          </p>
          {item.body && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.5] text-white/80 drop-shadow-sm">
              {item.body}
            </p>
          )}
        </div>

        {/* 点赞：右下角，与客户端一致 */}
        <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full px-1 text-[11px] font-medium text-white tabular-nums drop-shadow-sm">
          <Heart className="h-3.5 w-3.5" />
          {formatNumber(item.likes)}
        </span>

        {/* 管理操作：仅悬停时在右上角出现，不影响卡片外观 */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {canEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleStatus();
              }}
              className="rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-[#1D1D1F] shadow-xs backdrop-blur-sm hover:bg-white"
            >
              {item.status === 'published' ? '转私密' : '发布'}
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen('edit', item.id);
              }}
              aria-label={`编辑 ${item.title}`}
              className="rounded-lg bg-white/90 p-1.5 text-[#1D1D1F] shadow-xs backdrop-blur-sm hover:bg-white hover:text-[#0071E3]"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRequestDelete(item);
              }}
              aria-label={`删除 ${item.title}`}
              className="rounded-lg bg-white/90 p-1.5 text-[#1D1D1F] shadow-xs backdrop-blur-sm hover:bg-white hover:text-[#D70015]"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ImageTextManagerView({
  items,
  query,
  loading,
  onQueryChange,
  onRefresh,
  onOpen,
  permissions,
}: ImageTextManagerViewProps) {
  const canAdd = hasModulePerm('imagetexts', 'Add', permissions);
  const canEdit = hasModulePerm('imagetexts', 'Edit', permissions);
  const canDelete = hasModulePerm('imagetexts', 'Delete', permissions);
  const [searchText, setSearchText] = useState(query.searchKey || '');
  /** 批量选择：选中的图文ID集合，改筛选后清空 */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** 待删除的图文（单条或批量），非空时打开通用删除确认模态框 */
  const [pendingDelete, setPendingDelete] = useState<ImageTextItem[]>([]);
  const { options: categoryOptions } = usePublishCategories('GRAPHIC');
  const categoryName = (code: string) => publishCategoryName(categoryOptions, code);

  const statusFilter = query.status || 'all';
  const categoryFilter = query.category || 'all';
  const sortOrder = query.sortOrder || 'DESCEND';

  /** 分类 chip 使用完整分类字典，避免筛选后只剩当前结果的分类 */
  const categoryChips = useMemo(
    () => categoryOptions.map((option) => ({
      code: option.code,
      label: option.name || categoryName(option.code) || option.code,
    })),
    [categoryOptions]
  );

  useEffect(() => {
    setSearchText(query.searchKey || '');
  }, [query.searchKey]);

  // 搜索防抖后发请求，筛选与排序直接切换查询条件
  useEffect(() => {
    const keyword = searchText.trim();
    if (keyword === (query.searchKey || '').trim()) return;
    const timer = window.setTimeout(() => {
      onQueryChange({ ...query, searchKey: keyword, current: 1 });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText, query, onQueryChange]);

  const firstQuery = useRef(true);
  useEffect(() => {
    if (firstQuery.current) {
      firstQuery.current = false;
      return;
    }
    setSelected(new Set());
  }, [query]);

  function changeQuery(patch: Partial<GraphicPageQuery>) {
    onQueryChange({ ...query, ...patch });
  }

  // 状态、分类、排序、搜索均已下沉到后端，这里直接展示查询结果
  const filtered = items;

  /** 当前筛选结果的全选状态 */
  const allSelected = filtered.length > 0 && filtered.every((it) => selected.has(it.id));
  const someSelected = filtered.some((it) => selected.has(it.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** 全选/取消全选当前筛选结果 */
  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((it) => next.delete(it.id));
      else filtered.forEach((it) => next.add(it.id));
      return next;
    });
  }

  /** 单条删除：打开模态框 */
  function requestDelete(item: ImageTextItem) {
    setPendingDelete([item]);
  }

  /** 批量删除：打开模态框 */
  function requestBatchDelete() {
    setPendingDelete(items.filter((it) => selected.has(it.id)));
  }

  /** 确认删除：调后端 delete（数组入参），成功后清空选择并刷新 */
  async function handleConfirmDelete() {
    await api.deleteImageTexts(pendingDelete.map((it) => it.id));
    setSelected(new Set());
    await onRefresh();
  }

  async function handleToggleStatus(item: ImageTextItem) {
    const nextStatus: ContentStatus = item.status === 'published' ? 'draft' : 'published';
    await api.updateImageText(item.id, { status: nextStatus });
    await onRefresh();
  }

  return (
    <>
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-[320px]">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索图文标题、正文或分类..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 transition-all"
            />
          </div>

          <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px]">
            {(
              [
                { key: 'all', label: '全部' },
                { key: 'published', label: '已发布' },
                { key: 'draft', label: '私密' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => changeQuery({
                  status: tab.key === 'all' ? undefined : tab.key,
                  current: 1,
                })}
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

        <div className="flex items-center gap-2 shrink-0">
          <SortOrderButton
            order={sortOrder}
            onChange={(order) => changeQuery({ sortOrder: order, current: 1 })}
          />
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
      </div>

      {/* 分类筛选：与客户端图文页顶部的分类 chip 一致 */}
      {categoryChips.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ code: 'all', label: '全部' }, ...categoryChips].map((chip) => {
            const active = categoryFilter === chip.code;
            return (
              <button
                key={chip.code}
                type="button"
                onClick={() => changeQuery({
                  category: chip.code === 'all' ? undefined : chip.code,
                  current: 1,
                })}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? 'bg-[#1D1D1F] font-medium text-white'
                    : 'bg-black/[0.04] text-[#6E6E73] hover:bg-black/[0.07]'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 批量操作条：全选与已选数量放一起，始终显示（有数据时） */}
      {canDelete && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleSelectAll}
              aria-label={allSelected ? '取消全选' : '全选'}
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                allSelected
                  ? 'border-[#0071E3] bg-[#0071E3] text-white'
                  : someSelected
                    ? 'border-[#0071E3] text-[#0071E3]'
                    : 'border-[#C7C7CC] text-transparent'
              }`}
            >
              {allSelected ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : someSelected ? (
                <span className="h-0.5 w-2 rounded-full bg-[#0071E3]" />
              ) : null}
            </button>
            <span
              className={`text-[13px] font-medium ${
                selected.size > 0 ? 'text-[#0071E3]' : 'text-[#6E6E73]'
              }`}
            >
              全选 · 已选择 {selected.size} 篇图文
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
              className="h-8 px-3 rounded-[10px] text-[12px] font-medium text-[#6E6E73] hover:bg-[#F5F5F7] disabled:opacity-40 disabled:hover:bg-transparent transition-colors inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              取消选择
            </button>
            <button
              type="button"
              onClick={requestBatchDelete}
              disabled={selected.size === 0}
              className="h-8 px-3 rounded-[10px] bg-[#FF3B30] hover:bg-[#D70015] disabled:opacity-40 text-white text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              批量删除{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </div>
        </div>
      )}

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
        /* 瀑布流：与客户端图文列表一致的多列卡片布局（列宽紧凑、卡片自带间距） */
        <div className="columns-2 gap-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6">
          {filtered.map((item) => (
            <ImageTextCard
              key={item.id}
              item={item}
              canEdit={canEdit}
              canDelete={canDelete}
              selected={selected.has(item.id)}
              onToggleSelect={toggleSelect}
              onRequestDelete={requestDelete}
              onOpen={onOpen}
              onToggleStatus={() => void handleToggleStatus(item)}
            />
          ))}
        </div>
      )}
    </div>

    {/* 通用删除确认模态框：单条与批量共用 */}
    {pendingDelete.length > 0 && (
      <DeleteConfirmModal
        title={pendingDelete.length === 1 ? '确认删除该图文？' : `确认删除 ${pendingDelete.length} 篇图文？`}
        itemTitles={pendingDelete.map((it) => it.title)}
        description="此操作不可撤销，选中的图文将从列表中永久移除。"
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete([])}
      />
    )}
    </>
  );
}
