import { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Edit3,
  FileText,
  ImagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api, uploadFileWithProgress } from '../lib/api.ts';
import { formatDateShort, formatNumber } from '../lib/format.ts';
import type { ArticleItem, ContentStatus } from '../types/cms.ts';
import { MediaImage } from './MediaImage.tsx';

interface ArticleManagerViewProps {
  articles: ArticleItem[];
  onRefresh: () => Promise<void>;
  externalCreateTrigger?: number;
}

const ARTICLE_CATEGORIES = ['设计方法论', '产品思考', '数据洞察', '专题访谈', '行业观察'];

function renderMarkdownBlocks(markdown: string) {
  const lines = markdown.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-3" />;
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-[17px] font-semibold text-[#1D1D1F] mt-5 mb-2">
          {trimmed.slice(4)}
        </h3>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-[20px] font-semibold text-[#1D1D1F] mt-6 mb-2.5">
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith('> ')) {
      return (
        <blockquote
          key={idx}
          className="my-3 px-4 py-3 rounded-xl bg-[#F5F5F7] text-[14px] text-[#424245] italic"
        >
          {trimmed.slice(2)}
        </blockquote>
      );
    }
    if (trimmed.startsWith('- ')) {
      return (
        <li key={idx} className="ml-5 list-disc text-[15px] text-[#1D1D1F] leading-relaxed my-1">
          {trimmed.slice(2)}
        </li>
      );
    }
    if (trimmed === '---') {
      return <hr key={idx} className="my-5 border-[#E5E5EA]" />;
    }
    return (
      <p key={idx} className="text-[15px] text-[#1D1D1F] leading-[1.75] my-1.5">
        {trimmed}
      </p>
    );
  });
}

export function ArticleManagerView({
  articles,
  onRefresh,
  externalCreateTrigger,
}: ArticleManagerViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ArticleItem | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('设计方法论');
  const [coverUrl, setCoverUrl] = useState('');
  const [status, setStatus] = useState<ContentStatus>('published');
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Reader & Delete modal state
  const [readingItem, setReadingItem] = useState<ArticleItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ArticleItem | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTriggerRef = useRef(externalCreateTrigger || 0);

  if (externalCreateTrigger && externalCreateTrigger !== lastTriggerRef.current) {
    lastTriggerRef.current = externalCreateTrigger;
    queueMicrotask(() => openCreateModal());
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    });
  }, [articles, search, statusFilter]);

  const liveWordCount = useMemo(
    () => content.replace(/\s+/g, '').length,
    [content]
  );
  const liveReadMin = Math.max(1, Math.ceil(liveWordCount / 300));

  function openCreateModal() {
    setEditingItem(null);
    setTitle('');
    setSummary('');
    setContent('');
    setCategory('设计方法论');
    setCoverUrl('');
    setStatus('published');
    setEditorTab('write');
    setFormError('');
    setEditorOpen(true);
  }

  function openEditModal(item: ArticleItem) {
    setEditingItem(item);
    setTitle(item.title);
    setSummary(item.summary);
    setContent(item.content);
    setCategory(item.category);
    setCoverUrl(item.coverUrl);
    setStatus(item.status);
    setEditorTab('write');
    setFormError('');
    setEditorOpen(true);
  }

  function insertSnippet(snippet: string) {
    const el = textareaRef.current;
    if (!el) {
      setContent((c) => `${c}${c ? '\n' : ''}${snippet}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = content.slice(0, start) + snippet + content.slice(end);
    setContent(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  }

  async function handleCoverUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      setFormError('封面图片仅支持 JPG / PNG / WebP');
      return;
    }
    setCoverUploading(true);
    setFormError('');
    try {
      const uploaded = await uploadFileWithProgress(file);
      setCoverUrl(uploaded.url);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '上传封面失败');
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setFormError('请输入文章标题');
      return;
    }
    if (!content.trim()) {
      setFormError('请输入文章正文内容');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: Partial<ArticleItem> = {
        title: title.trim(),
        summary: summary.trim() || content.trim().slice(0, 80),
        content: content.trim(),
        category,
        coverUrl: coverUrl || '/src/assets/images/article_cover_typography_1795026087411.jpg',
        status,
      };
      if (editingItem) {
        await api.updateArticle(editingItem.id, payload);
      } else {
        await api.createArticle(payload);
      }
      await onRefresh();
      setEditorOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(item: ArticleItem) {
    const nextStatus: ContentStatus = item.status === 'published' ? 'draft' : 'published';
    await api.updateArticle(item.id, { status: nextStatus });
    await onRefresh();
  }

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return;
    await api.deleteArticle(confirmDelete.id);
    setConfirmDelete(null);
    await onRefresh();
  }

  function openReader(item: ArticleItem) {
    setReadingItem(item);
    void api.trackView('article', item.id).then(() => onRefresh());
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

        <button
          type="button"
          onClick={openCreateModal}
          className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>撰写文章</span>
        </button>
      </div>

      {/* Article List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-16 px-6 text-center">
          <FileText className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">暂无匹配文章</h3>
          <p className="text-[13px] text-[#6E6E73] mt-1">
            使用内置简洁排版编辑器撰写专栏长文，自动统计字数与预计阅读时间
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>开始撰写</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] divide-y divide-[#F2F2F7] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="p-5 hover:bg-[#FAFAFC] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
            >
              <div
                onClick={() => openReader(item)}
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
                    <span>{item.category}</span>
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
                    onClick={() => openReader(item)}
                    className="px-2.5 py-1 rounded-lg text-[12px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors inline-flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>阅读</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item)}
                    className="px-2.5 py-1 rounded-lg text-[12px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors"
                  >
                    {item.status === 'published' ? '转草稿' : '发布'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    aria-label={`编辑 ${item.title}`}
                    className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F2F2F7]"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(item)}
                    aria-label={`删除 ${item.title}`}
                    className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#D70015] hover:bg-[#FF3B30]/8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Article Writer / Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-[780px] max-h-[92vh] overflow-y-auto bg-white rounded-[22px] border border-[#E5E5EA] shadow-[0_24px_60px_rgba(0,0,0,0.16)] p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[19px] font-semibold text-[#1D1D1F]">
                  {editingItem ? '编辑专栏文章' : '撰写新文章'}
                </h2>
                <p className="text-[12px] text-[#6E6E73] mt-0.5 tabular-nums">
                  当前 {formatNumber(liveWordCount)} 字 · 预计阅读 {liveReadMin} 分钟
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="关闭"
                className="w-9 h-9 rounded-full bg-[#F5F5F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#6E6E73]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Cover Upload */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-2xl bg-[#F5F5F7]">
                <div className="w-40 aspect-[16/9] rounded-xl overflow-hidden bg-[#E5E5EA] shrink-0">
                  <MediaImage
                    src={coverUrl}
                    alt="文章封面"
                    fallbackLabel="文章封面"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-[#1D1D1F]">文章头图封面</div>
                  <p className="text-[12px] text-[#6E6E73] mt-0.5">
                    建议上传 16:9 横版高清插图或摄影作品
                  </p>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleCoverUpload(f);
                    }}
                  />
                  <button
                    type="button"
                    disabled={coverUploading}
                    onClick={() => coverInputRef.current?.click()}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5EA] text-[12px] font-medium text-[#1D1D1F] hover:bg-[#FAFAFA] inline-flex items-center gap-1.5"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>{coverUploading ? '正在上传...' : '上传文章封面'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
                  文章标题
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入具有吸引力的文章标题"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[15px] font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
                    文章栏目
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] text-[14px] text-[#1D1D1F] focus:bg-white focus:outline-none"
                  >
                    {ARTICLE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
                    发布状态
                  </label>
                  <div className="flex items-center p-1 bg-[#F2F2F7] rounded-xl h-10">
                    <button
                      type="button"
                      onClick={() => setStatus('published')}
                      className={`flex-1 h-8 rounded-lg text-[13px] font-medium transition-all ${
                        status === 'published' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
                      }`}
                    >
                      立即发布
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('draft')}
                      className={`flex-1 h-8 rounded-lg text-[13px] font-medium transition-all ${
                        status === 'draft' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
                      }`}
                    >
                      存为草稿
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
                  导语摘要
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="一句话概括文章核心观点（留空将自动截取正文前段）"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[14px]"
                />
              </div>

              {/* Editor + Preview Toggle */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    {editorTab === 'write' && (
                      <>
                        <button
                          type="button"
                          onClick={() => insertSnippet('\n## 章节标题\n')}
                          className="px-2.5 py-1 rounded-lg bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[12px] font-medium text-[#1D1D1F]"
                        >
                          H2 标题
                        </button>
                        <button
                          type="button"
                          onClick={() => insertSnippet('\n### 小节标题\n')}
                          className="px-2.5 py-1 rounded-lg bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[12px] font-medium text-[#1D1D1F]"
                        >
                          H3 小节
                        </button>
                        <button
                          type="button"
                          onClick={() => insertSnippet('\n> 引用关键洞察内容\n')}
                          className="px-2.5 py-1 rounded-lg bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[12px] font-medium text-[#1D1D1F]"
                        >
                          引用块
                        </button>
                        <button
                          type="button"
                          onClick={() => insertSnippet('\n- 要点条目')}
                          className="px-2.5 py-1 rounded-lg bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[12px] font-medium text-[#1D1D1F]"
                        >
                          列表
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px]">
                    <button
                      type="button"
                      onClick={() => setEditorTab('write')}
                      className={`px-3 py-1 rounded-[8px] text-[12px] font-medium ${
                        editorTab === 'write' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
                      }`}
                    >
                      编辑正文
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      className={`px-3 py-1 rounded-[8px] text-[12px] font-medium ${
                        editorTab === 'preview' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
                      }`}
                    >
                      排版预览
                    </button>
                  </div>
                </div>

                {editorTab === 'write' ? (
                  <textarea
                    ref={textareaRef}
                    rows={10}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="支持使用 ## 标题、### 小节、> 引用、- 列表进行清晰排版..."
                    className="w-full p-4 rounded-2xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[14px] leading-relaxed font-sans"
                  />
                ) : (
                  <div className="min-h-[250px] max-h-[360px] overflow-y-auto p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E5EA]">
                    {content.trim() ? (
                      renderMarkdownBlocks(content)
                    ) : (
                      <p className="text-[13px] text-[#86868B]">暂无正文内容可预览</p>
                    )}
                  </div>
                )}
              </div>

              {formError && (
                <div className="rounded-xl bg-[#FF3B30]/8 px-3.5 py-2 text-[13px] text-[#D70015]">
                  {formError}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#F2F2F7] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="h-10 px-4 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[13px] font-medium text-[#1D1D1F]"
              >
                取消
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="h-10 px-5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-60 text-white text-[13px] font-medium"
              >
                {saving ? '正在保存...' : editingItem ? '保存更新' : '发布文章'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article Reader Modal */}
      {readingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
          <div className="w-full max-w-[740px] max-h-[90vh] overflow-y-auto bg-white rounded-[22px] shadow-2xl">
            <div className="relative h-56 sm:h-72 bg-[#F2F2F7]">
              <MediaImage
                src={readingItem.coverUrl}
                alt={readingItem.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setReadingItem(null)}
                aria-label="关闭阅读窗口"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 sm:p-9">
              <div className="text-[12px] text-[#6E6E73] mb-2 tabular-nums">
                {readingItem.category} · {formatDateShort(readingItem.updatedAt)} · {readingItem.authorName} · 约 {readingItem.readTimeMin} 分钟阅读
              </div>
              <h2 className="text-[24px] font-semibold tracking-tight text-[#1D1D1F] leading-snug">
                {readingItem.title}
              </h2>
              <p className="mt-3 text-[15px] text-[#6E6E73] leading-relaxed">
                {readingItem.summary}
              </p>
              <hr className="my-6 border-[#E5E5EA]" />
              <div>{renderMarkdownBlocks(readingItem.content)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-[380px] bg-white rounded-[20px] border border-[#E5E5EA] p-6 shadow-xl">
            <h3 className="text-[17px] font-semibold text-[#1D1D1F]">确认删除该文章？</h3>
            <p className="mt-2 text-[13px] text-[#6E6E73] leading-relaxed">
              即将永久删除「{confirmDelete.title}」，操作无法撤销。
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="h-9 px-4 rounded-xl bg-[#F5F5F7] text-[13px] font-medium text-[#1D1D1F]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="h-9 px-4 rounded-xl bg-[#FF3B30] hover:bg-[#D70015] text-white text-[13px] font-medium"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
