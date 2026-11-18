import { useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  ImagePlus,
  Images,
  MapPin,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { api, uploadFileWithProgress } from '../lib/api.ts';
import { formatDateShort, formatNumber } from '../lib/format.ts';
import type { ContentStatus, ImageTextItem } from '../types/cms.ts';
import { MediaImage } from './MediaImage.tsx';

interface ImageTextManagerViewProps {
  items: ImageTextItem[];
  onRefresh: () => Promise<void>;
  externalUploadTrigger?: number;
}

const IMAGETEXT_CATEGORIES = ['器物美学', '生活方式', '建筑摄影', '设计灵感', '城市记录'];

export function ImageTextManagerView({
  items,
  onRefresh,
  externalUploadTrigger,
}: ImageTextManagerViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');

  // Upload / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ImageTextItem | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('器物美学');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<ContentStatus>('published');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingHint, setUploadingHint] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Gallery Lightbox & Delete state
  const [viewingItem, setViewingItem] = useState<ImageTextItem | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<ImageTextItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTriggerRef = useRef(externalUploadTrigger || 0);

  if (externalUploadTrigger && externalUploadTrigger !== lastTriggerRef.current) {
    lastTriggerRef.current = externalUploadTrigger;
    queueMicrotask(() => openCreateModal());
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter !== 'all' && it.status !== statusFilter) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        it.body.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q) ||
        it.location.toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  function openCreateModal() {
    setEditingItem(null);
    setTitle('');
    setBody('');
    setCategory('器物美学');
    setLocation('');
    setStatus('published');
    setImages([]);
    setUploadingHint(null);
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(item: ImageTextItem) {
    setEditingItem(item);
    setTitle(item.title);
    setBody(item.body);
    setCategory(item.category);
    setLocation(item.location);
    setStatus(item.status);
    setImages([...item.images]);
    setUploadingHint(null);
    setFormError('');
    setModalOpen(true);
  }

  async function handleImageFiles(fileList: FileList | File[]) {
    const validFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setFormError('请选择 JPG、PNG、WebP 等图片文件');
      return;
    }
    setFormError('');
    const uploadedUrls: string[] = [];
    try {
      for (let i = 0; i < validFiles.length; i++) {
        const f = validFiles[i];
        setUploadingHint(`正在上传第 ${i + 1} / ${validFiles.length} 张图片...`);
        const res = await uploadFileWithProgress(f);
        uploadedUrls.push(res.url);
      }
      setImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setUploadingHint(null);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      void handleImageFiles(e.dataTransfer.files);
    }
  }

  function moveImage(index: number, delta: number) {
    setImages((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  }

  function setAsCover(index: number) {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [picked] = copy.splice(index, 1);
      return [picked, ...copy];
    });
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSave() {
    if (!title.trim()) {
      setFormError('请输入图文标题');
      return;
    }
    if (images.length === 0) {
      setFormError('请至少上传 1 张图片');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: Partial<ImageTextItem> = {
        title: title.trim(),
        body: body.trim(),
        category,
        location: location.trim(),
        status,
        images,
      };
      if (editingItem) {
        await api.updateImageText(editingItem.id, payload);
      } else {
        await api.createImageText(payload);
      }
      await onRefresh();
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(item: ImageTextItem) {
    const nextStatus: ContentStatus = item.status === 'published' ? 'draft' : 'published';
    await api.updateImageText(item.id, { status: nextStatus });
    await onRefresh();
  }

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return;
    await api.deleteImageText(confirmDelete.id);
    setConfirmDelete(null);
    await onRefresh();
  }

  function openGallery(item: ImageTextItem) {
    setViewingItem(item);
    setActiveSlide(0);
    void api.trackView('imagetext', item.id).then(() => onRefresh());
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
              placeholder="搜索图文标题、正文或拍摄地点..."
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
          <span>发布图文</span>
        </button>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-16 px-6 text-center">
          <Images className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">暂无图文作品</h3>
          <p className="text-[13px] text-[#6E6E73] mt-1">
            一次拖入多张高清图片，自由调整排序并设为封面即可发布
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
          >
            <ImagePlus className="w-4 h-4" />
            <span>创建第一篇图文</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col"
            >
              <div
                onClick={() => openGallery(item)}
                className="relative aspect-[4/3] bg-[#F2F2F7] overflow-hidden cursor-pointer group"
              >
                <MediaImage
                  src={item.images[0]}
                  alt={item.title}
                  fallbackLabel={item.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/55 backdrop-blur-md text-[11px] font-medium text-white tabular-nums">
                  {item.images.length} 张图片
                </div>
                {item.location && (
                  <div className="absolute bottom-3 left-3.5 flex items-center gap-1 text-[12px] text-white/95">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{item.location}</span>
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-[12px] text-[#6E6E73] mb-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{item.category}</span>
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
                    onClick={() => openGallery(item)}
                    className="text-[16px] font-semibold text-[#1D1D1F] leading-snug line-clamp-1 cursor-pointer hover:text-[#0071E3] transition-colors"
                  >
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] text-[#6E6E73] line-clamp-2 leading-relaxed">
                    {item.body || '暂无图文配文描述'}
                  </p>
                </div>

                {/* Mini Thumbnail Strip if multiple images */}
                {item.images.length > 1 && (
                  <div className="mt-3.5 flex items-center gap-1.5">
                    {item.images.slice(0, 4).map((imgUrl, idx) => (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() => {
                          setViewingItem(item);
                          setActiveSlide(idx);
                        }}
                        className="w-11 h-8 rounded-md overflow-hidden border border-[#E5E5EA] hover:opacity-85 transition-opacity"
                      >
                        <MediaImage src={imgUrl} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {item.images.length > 4 && (
                      <span className="text-[11px] text-[#86868B] pl-1 tabular-nums">
                        +{item.images.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-3.5 border-t border-[#F2F2F7] flex items-center justify-between gap-2">
                  <div className="text-[12px] text-[#86868B] tabular-nums">
                    {formatNumber(item.views)} 次浏览 · {formatNumber(item.likes)} 赞
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className="px-2.5 py-1 rounded-lg text-[12px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                    >
                      {item.status === 'published' ? '转草稿' : '发布'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      aria-label={`编辑 ${item.title}`}
                      className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F5F5F7] transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(item)}
                      aria-label={`删除 ${item.title}`}
                      className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Multi-Image Upload & Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-[680px] max-h-[90vh] overflow-y-auto bg-white rounded-[22px] border border-[#E5E5EA] shadow-[0_24px_60px_rgba(0,0,0,0.16)] p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[19px] font-semibold text-[#1D1D1F]">
                  {editingItem ? '编辑图文内容' : '上传并编排图文'}
                </h2>
                <p className="text-[13px] text-[#6E6E73] mt-0.5">
                  支持一次批量拖入多张图片，点击星标即可设为首页封面图
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="关闭"
                className="w-9 h-9 rounded-full bg-[#F5F5F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#6E6E73]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Multi-image Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-[#0071E3] bg-[#0071E3]/5'
                    : 'border-[#D1D1D6] bg-[#F5F5F7]/70 hover:bg-[#F5F5F7]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      void handleImageFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
                <ImagePlus className="w-7 h-7 text-[#0071E3] mx-auto mb-1.5" strokeWidth={1.6} />
                <div className="text-[14px] font-medium text-[#1D1D1F]">
                  点击批量选择或拖拽多张图片至此
                </div>
                <div className="text-[12px] text-[#86868B] mt-0.5">
                  {uploadingHint || '支持 JPG、PNG、WebP 高清图片，首张将自动作为封面'}
                </div>
              </div>

              {/* Sortable Uploaded Thumbnail Grid */}
              {images.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[12px] text-[#6E6E73] mb-2">
                    <span>已添加 {images.length} 张图片（第 1 张为展示封面）</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {images.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-[#E5E5EA] bg-[#F2F2F7]"
                      >
                        <MediaImage src={url} alt={`图片 ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#0071E3] text-white text-[10px] font-medium">
                            封面
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveImage(idx, -1)}
                              disabled={idx === 0}
                              aria-label="左移"
                              className="w-6 h-6 rounded-md bg-white/90 text-[#1D1D1F] disabled:opacity-40 flex items-center justify-center"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImage(idx, 1)}
                              disabled={idx === images.length - 1}
                              aria-label="右移"
                              className="w-6 h-6 rounded-md bg-white/90 text-[#1D1D1F] disabled:opacity-40 flex items-center justify-center"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => setAsCover(idx)}
                                aria-label="设为封面"
                                title="设为封面"
                                className="w-6 h-6 rounded-md bg-white/90 text-[#FF9500] flex items-center justify-center"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              aria-label="移除图片"
                              className="w-6 h-6 rounded-md bg-[#FF3B30] text-white flex items-center justify-center"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
                  图文标题
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：北向窗台下的粗陶静物光影"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[14px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
                    主题分类
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] text-[14px] text-[#1D1D1F] focus:bg-white focus:outline-none"
                  >
                    {IMAGETEXT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
                    拍摄地点
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="城市 · 场所（可选）"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[14px]"
                  />
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
                      发布
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('draft')}
                      className={`flex-1 h-8 rounded-lg text-[13px] font-medium transition-all ${
                        status === 'draft' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
                      }`}
                    >
                      草稿
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
                  图文配文
                </label>
                <textarea
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="写下这组影像背后的故事、质感描述或细节记录..."
                  className="w-full p-3.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[14px] resize-none leading-relaxed"
                />
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
                onClick={() => setModalOpen(false)}
                className="h-10 px-4 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[13px] font-medium text-[#1D1D1F]"
              >
                取消
              </button>
              <button
                type="button"
                disabled={saving || !!uploadingHint}
                onClick={handleSave}
                className="h-10 px-5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-60 text-white text-[13px] font-medium"
              >
                {saving ? '正在保存...' : editingItem ? '保存修改' : '发布图文'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Carousel Lightbox Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-[920px] bg-white rounded-[22px] overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-5">
            <div className="md:col-span-3 relative bg-[#111113] aspect-[4/3] md:aspect-auto md:min-h-[460px] flex items-center justify-center">
              <MediaImage
                src={viewingItem.images[activeSlide]}
                alt={viewingItem.title}
                className="w-full h-full object-contain max-h-[540px]"
              />
              {viewingItem.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSlide((i) =>
                        i === 0 ? viewingItem.images.length - 1 : i - 1
                      )
                    }
                    aria-label="上一张"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSlide((i) =>
                        i === viewingItem.images.length - 1 ? 0 : i + 1
                      )
                    }
                    aria-label="下一张"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black/55 text-white text-[12px] font-mono tabular-nums">
                    {activeSlide + 1} / {viewingItem.images.length}
                  </div>
                </>
              )}
            </div>

            <div className="md:col-span-2 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[12px] text-[#6E6E73]">
                    {viewingItem.category} · {formatDateShort(viewingItem.updatedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewingItem(null)}
                    aria-label="关闭"
                    className="w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#6E6E73]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-[19px] font-semibold text-[#1D1D1F] leading-snug">
                  {viewingItem.title}
                </h3>
                {viewingItem.location && (
                  <div className="mt-2 flex items-center gap-1 text-[12px] text-[#86868B]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{viewingItem.location}</span>
                  </div>
                )}
                <p className="mt-4 text-[14px] text-[#424245] leading-relaxed whitespace-pre-line">
                  {viewingItem.body}
                </p>

                {viewingItem.images.length > 1 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {viewingItem.images.map((imgUrl, idx) => (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() => setActiveSlide(idx)}
                        className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                          activeSlide === idx ? 'border-[#0071E3]' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <MediaImage src={imgUrl} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#F2F2F7] flex items-center justify-between text-[12px] text-[#86868B] tabular-nums">
                <span>作者：{viewingItem.authorName}</span>
                <span>
                  {formatNumber(viewingItem.views)} 浏览 · {formatNumber(viewingItem.likes)} 赞
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-[380px] bg-white rounded-[20px] border border-[#E5E5EA] p-6 shadow-xl">
            <h3 className="text-[17px] font-semibold text-[#1D1D1F]">确认删除该图文？</h3>
            <p className="mt-2 text-[13px] text-[#6E6E73] leading-relaxed">
              即将永久删除「{confirmDelete.title}」，操作不可恢复。
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
