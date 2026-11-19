import { useMemo, useState } from 'react';
import {
  BookOpen,
  Edit3,
  FileText,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../../../lib/api.ts';
import { hasModulePerm } from '../../../lib/menu.ts';
import { formatDateShort, formatNumber } from '../../../lib/format.ts';
import type { ArticleItem, ContentStatus } from '../../../types/cms.ts';
import { publishCategoryName } from '../../../lib/category.ts';
import { usePublishCategories } from '../../../lib/usePublishCategories.ts';
import { MediaImage } from '../../../components/MediaImage.tsx';

interface ArticleManagerViewProps {
  articles: ArticleItem[];
  onRefresh: () => Promise<void>;
  onOpen: (action: 'new' | 'edit' | 'view' | 'delete', id?: string) => void;
  permissions?: string[];
}

export function ArticleManagerView({
  articles,
  onRefresh,
  onOpen,
  permissions,
}: ArticleManagerViewProps) {
  const canAdd = hasModulePerm('articles', 'Add', permissions);
  const canEdit = hasModulePerm('articles', 'Edit', permissions);
  const canDelete = hasModulePerm('articles', 'Delete', permissions);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');
  const { options: categoryOptions } = usePublishCategories('ARTICLE');
  const categoryName = (code: string) => publishCategoryName(categoryOptions, code);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        categoryName(a.category).toLowerCase().includes(q)
      );
    });
  }, [articles, search, statusFilter, categoryOptions]);

  async function handleToggleStatus(item: ArticleItem) {
    const nextStatus: ContentStatus = item.status === 'published' ? 'draft' : 'published';
    await api.updateArticle(item.id, { status: nextStatus });
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
              placeholder="搜索文章标题、摘要或分类..."
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
            <span>撰写文章</span>
          </button>
        )}
      </div>

      {/* Article List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-16 px-6 text-center">
          <FileText className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">暂无匹配文章</h3>
          <p className="text-[13px] text-[#6E6E73] mt-1">
            使用内置简洁排版编辑器撰写专栏长文，自动统计字数与预计阅读时间
          </p>
          {canAdd && (
            <button
              type="button"
              onClick={() => onOpen('new')}
              className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>开始撰写</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] divide-y divide-[#F2F2F7] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="p-5 hover:bg-[#FAFAFC] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
            >
              <div
                onClick={() => onOpen('view', item.id)}
                className="flex flex-col sm:flex-row items-start gap-4 flex-1 min-w-0 cursor-pointer group"
              >
                <div className="w-full sm:w-44 aspect-[16/10] rounded-xl overflow-hidden bg-[#F2F2F7] shrink-0">
                  <MediaImage
                    src={item.coverUrl}
                    alt={item.title}
                    fallbackLabel={item.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#6E6E73] mb-1.5 tabular-nums">
                    <span>{categoryName(item.category)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDateShort(item.updatedAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatNumber(item.wordCount)} 字</span>
                    <span aria-hidden="true">·</span>
                    <span>约 {item.readTimeMin} 分钟阅读</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-medium ${
                        item.status === 'published' ? 'text-[#16A34A]' : 'text-[#D97706]'
                      }`}
                    >
                      {item.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>

                  <h3 className="text-[17px] font-semibold text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[13px] text-[#6E6E73] line-clamp-2 leading-relaxed max-w-3xl">
                    {item.summary}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0">
                <div className="text-[13px] font-semibold text-[#1D1D1F] tabular-nums">
                  {formatNumber(item.views)}{' '}
                  <span className="text-[12px] font-normal text-[#86868B]">阅读</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOpen('view', item.id)}
                    className="px-2.5 py-1 rounded-lg text-[12px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors inline-flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>阅读</span>
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(item)}
                      className="px-2.5 py-1 rounded-lg text-[12px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors"
                    >
                      {item.status === 'published' ? '转草稿' : '发布'}
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onOpen('edit', item.id)}
                      aria-label={`编辑 ${item.title}`}
                      className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F2F2F7]"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onOpen('delete', item.id)}
                      aria-label={`删除 ${item.title}`}
                      className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#D70015] hover:bg-[#FF3B30]/8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
