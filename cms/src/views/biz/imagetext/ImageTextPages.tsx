import { useEffect, useRef, useState, type DragEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Star,
  X,
} from 'lucide-react';
import { api, convertToWebp } from '../../../lib/api.ts';
import { deleteFilesByUrls, removedUrls } from '../../../lib/fileCenter.ts';
import {
  createPendingFile,
  releasePendingFile,
  releasePendingFiles,
  uploadPendingFiles,
  type PendingFile,
} from '../../../lib/pendingUpload.ts';
import { formatDateShort, formatNumber } from '../../../lib/format.ts';
import { publishCategoryName, resolvePublishCategoryCode } from '../../../lib/category.ts';
import { usePublishCategories } from '../../../lib/usePublishCategories.ts';
import type { ContentStatus, ImageTextItem } from '../../../types/cms.ts';
import { CategorySelect } from '../../../components/CategorySelect.tsx';
import { MediaImage } from '../../../components/MediaImage.tsx';
import { PageShell } from '../../../components/PageShell.tsx';
import {
  EditorWorkspace,
  type PreviewDevice,
} from '../../../components/EditorWorkspace.tsx';

interface ImageTextPreviewProps {
  device: PreviewDevice;
  images: string[];
  title: string;
  body: string;
  category: string;
  status: ContentStatus;
}

/** 右侧实时预览：图文卡片按设备宽度自适应，多图以轮播形式预览 */
function ImageTextPreview({
  device,
  images,
  title,
  body,
  category,
  status,
}: ImageTextPreviewProps) {
  const compact = device === 'mobile';
  const total = images.length;
  const [active, setActive] = useState(0);

  // 图片被删除后当前索引可能越界，回到第一张
  useEffect(() => {
    if (active > total - 1) setActive(0);
  }, [active, total]);

  const goPrev = () => setActive((i) => (total ? (i - 1 + total) % total : 0));
  const goNext = () => setActive((i) => (total ? (i + 1) % total : 0));
  const current = images[Math.min(active, Math.max(total - 1, 0))];

  return (
    <div className="bg-white">
      <div className="relative aspect-[4/3] bg-[#F2F2F7] overflow-hidden">
        <MediaImage
          src={current}
          alt="图文封面预览"
          fallbackLabel="图文封面预览"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/55 backdrop-blur-md text-[11px] font-medium text-white tabular-nums">
          {total ? `${active + 1} / ${total}` : '0 张图片'}
        </div>
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="上一张"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="下一张"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {images.map((url, idx) => (
                <button
                  key={`${url}-dot-${idx}`}
                  type="button"
                  onClick={() => setActive(idx)}
                  aria-label={`第 ${idx + 1} 张图片`}
                  aria-current={idx === active}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === active ? 'w-4 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className={compact ? 'p-4' : 'p-5'}>
        <div className="flex items-center justify-between gap-2 text-[11px] text-[#6E6E73]">
          <span className="truncate">{category || '未分类'} · 刚刚</span>
          <span
            className={`font-medium shrink-0 ${
              status === 'published' ? 'text-[#16A34A]' : 'text-[#D97706]'
            }`}
          >
            {status === 'published' ? '已发布' : '草稿'}
          </span>
        </div>
        <h3 className={`${compact ? 'text-[16px]' : 'text-[18px]'} font-semibold text-[#1D1D1F] mt-1.5 leading-snug`}>
          {title || '未命名图文'}
        </h3>
        <p className="mt-2 text-[13px] text-[#6E6E73] leading-relaxed whitespace-pre-line">
          {body || '暂无图文配文描述'}
        </p>
        {total > 1 && (
          <div className="mt-4 pt-3 border-t border-[#F2F2F7] flex items-center gap-1.5">
            {images.slice(0, 6).map((url, idx) => (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => setActive(idx)}
                aria-label={`查看第 ${idx + 1} 张图片`}
                className={`w-11 h-9 rounded-md overflow-hidden border shrink-0 transition-all ${
                  idx === active
                    ? 'border-[#0071E3] ring-1 ring-[#0071E3]/40'
                    : 'border-[#E5E5EA] opacity-70 hover:opacity-100'
                }`}
              >
                <MediaImage src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            {images.length > 6 && (
              <span className="text-[11px] text-[#86868B] tabular-nums">
                +{images.length - 6}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 编辑区里的一张图片：可能是已上传的地址，也可能是本地暂存待上传的文件 */
interface ImageEntry {
  key: string;
  /** 已上传后的真实地址；本地待上传时为空串 */
  url: string;
  /** 待上传文件，点击保存时才真正上传 */
  pending?: PendingFile;
  /** 预览地址：已上传为真实地址，待上传为 blob 地址 */
  previewUrl: string;
}

function entriesFromUrls(urls: string[]): ImageEntry[] {
  return urls.map((url, idx) => ({
    key: `saved-${idx}-${url}`,
    url,
    previewUrl: url,
  }));
}

interface ImageTextEditorPageProps {
  item?: ImageTextItem;
  onSaved: () => Promise<void>;
  onBack: () => void;
}

/** 图文新建 / 编辑独立页面（原多图上传编辑弹窗） */
export function ImageTextEditorPage({ item, onSaved, onBack }: ImageTextEditorPageProps) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? 'published');
  // 图片先在浏览器本地暂存，点击保存时才真正上传到服务器
  const [images, setImages] = useState<ImageEntry[]>(() => entriesFromUrls(item?.images ?? []));
  const [preparingHint, setPreparingHint] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  // 离开页面时释放尚未上传的本地预览地址
  useEffect(
    () => () => {
      releasePendingFiles(imagesRef.current.map((entry) => entry.pending));
    },
    []
  );

  const {
    options: categoryOptions,
    loading: categoryLoading,
    error: categoryError,
  } = usePublishCategories('GRAPHIC');

  // 历史数据可能存的是分类名称，加载后端分类后统一换成编码
  useEffect(() => {
    if (categoryLoading || !category) return;
    const resolved = resolvePublishCategoryCode(categoryOptions, category);
    if (resolved !== category) setCategory(resolved);
  }, [category, categoryLoading, categoryOptions]);

  const categoryLabel = publishCategoryName(categoryOptions, category);

  async function handleImageFiles(fileList: FileList | File[]) {
    const validFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setFormError('请选择 JPG、PNG、WebP 等图片文件');
      return;
    }
    setFormError('');
    const entries: ImageEntry[] = [];
    try {
      for (let i = 0; i < validFiles.length; i++) {
        setPreparingHint(`正在本地处理第 ${i + 1} / ${validFiles.length} 张图片...`);
        // 只在本地压缩为 WebP 并生成预览，文件暂存在浏览器内，不发起上传
        const webpFile = await convertToWebp(validFiles[i]);
        const pending = createPendingFile(webpFile);
        entries.push({ key: pending.key, url: '', pending, previewUrl: pending.previewUrl });
      }
      setImages((prev) => [...prev, ...entries]);
    } catch (err) {
      releasePendingFiles(entries.map((entry) => entry.pending));
      setFormError(err instanceof Error ? err.message : '图片处理失败');
    } finally {
      setPreparingHint(null);
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
      const [moved] = copy.splice(index, 1);
      copy.splice(target, 0, moved);
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
    const target = images[index];
    // 本地暂存的图片移除后立即释放预览地址
    if (target?.pending) releasePendingFile(target.pending);
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSave() {
    if (!title.trim()) {
      setFormError('请输入图文标题');
      return;
    }
    if (images.length === 0) {
      setFormError('请至少选择 1 张图片');
      return;
    }
    const finalCategory = resolvePublishCategoryCode(categoryOptions, category);
    if (!finalCategory) {
      setFormError(categoryError || '请选择图文分类');
      return;
    }
    setSaving(true);
    setFormError('');
    // 点击保存时才真正上传本地暂存的图片
    const pendingEntries = images.filter((entry) => entry.pending);
    const uploadedByKey = new Map<string, string>();
    setSaveProgress(pendingEntries.length ? 0 : null);
    try {
      if (pendingEntries.length) {
        await uploadPendingFiles(
          pendingEntries.map((entry) => entry.pending as PendingFile),
          (pct) => setSaveProgress(pct),
          (uploaded, url) => {
            uploadedByKey.set(uploaded.key, url);
            releasePendingFile(uploaded);
            // 上传成功立即回填真实地址，后续失败重试时不会重复上传
            setImages((prev) =>
              prev.map((entry) =>
                entry.key === uploaded.key ? { key: entry.key, url, previewUrl: url } : entry
              )
            );
          }
        );
      }
      const finalImages = images
        .map((entry) => (entry.pending ? uploadedByKey.get(entry.key) ?? '' : entry.url))
        .filter((url): url is string => !!url);

      const payload: Partial<ImageTextItem> = {
        title: title.trim(),
        body: body.trim(),
        category: finalCategory,
        status,
        images: finalImages,
      };
      if (item) {
        await api.updateImageText(item.id, payload);
        // 保存成功后彻底删除被移除/替换掉的历史图片，避免留下孤儿文件
        void deleteFilesByUrls(removedUrls(item.images, finalImages));
      } else {
        await api.createImageText(payload);
      }
      await onSaved();
      onBack();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
      setSaveProgress(null);
    }
  }

  return (
    <EditorWorkspace
      title={item ? '编辑图文内容' : '上传并编排图文'}
      subtitle="支持一次批量拖入多张图片，点击星标即可设为首页封面图"
      onBack={onBack}
      actions={
        <>
          <button
            type="button"
            onClick={onBack}
            className="h-10 px-4 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[13px] font-medium text-[#1D1D1F]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={saving || !!preparingHint}
            onClick={() => void handleSave()}
            className="h-10 px-5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-60 text-white text-[13px] font-medium"
          >
            {saving
              ? saveProgress !== null
                ? `正在上传 ${saveProgress}%`
                : '正在保存...'
              : item
                ? '保存修改'
                : '发布图文'}
          </button>
        </>
      }
      editor={
        <div className="space-y-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-7 text-center cursor-pointer transition-colors ${
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
            {preparingHint || '仅支持图片（JPG / PNG / WebP），首张自动作为封面 · 保存时才上传'}
          </div>
        </div>

        {images.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-[12px] text-[#6E6E73] mb-2">
              <span>已添加 {images.length} 张图片（第 1 张为展示封面）</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((entry, idx) => (
                <div
                  key={entry.key}
                  className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-[#E5E5EA] bg-[#F2F2F7]"
                >
                  <MediaImage
                    src={entry.previewUrl}
                    alt={`图片 ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#0071E3] text-white text-[10px] font-medium">
                      封面
                    </div>
                  )}
                  {entry.pending && (
                    <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-medium">
                      待上传
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
          <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">图文标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：北向窗台下的粗陶静物光影"
            className="w-full h-10 px-3.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[14px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <CategorySelect
            module="GRAPHIC"
            value={category}
            onChange={setCategory}
            label="主题分类"
            required
            ariaLabel="主题分类"
            className="w-full"
          />
          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">发布状态</label>
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
          <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">图文配文</label>
          <textarea
            rows={5}
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
      }
      preview={(device) => (
        <ImageTextPreview
          device={device}
          images={images.map((entry) => entry.previewUrl)}
          title={title}
          body={body}
          category={categoryLabel}
          status={status}
        />
      )}
    />
  );
}

interface ImageViewPageProps {
  item: ImageTextItem;
  slide?: number;
  onRefresh: () => Promise<void>;
  onBack: () => void;
}

/** 图文相册独立页面（原灯箱弹窗） */
export function ImageViewPage({ item, slide = 0, onRefresh, onBack }: ImageViewPageProps) {
  const [activeSlide, setActiveSlide] = useState(
    Math.min(Math.max(slide, 0), Math.max(item.images.length - 1, 0))
  );

  useEffect(() => {
    void api.trackView('imagetext', item.id).then(() => onRefresh());
  }, [item.id, onRefresh]);

  const total = item.images.length;
  const goPrev = () => setActiveSlide((i) => (i === 0 ? total - 1 : i - 1));
  const goNext = () => setActiveSlide((i) => (i === total - 1 ? 0 : i + 1));

  return (
    <PageShell
      title={item.title}
      subtitle={`${item.category} · ${formatDateShort(item.updatedAt)}`}
      onBack={onBack}
      maxWidth="max-w-[1040px]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="relative rounded-2xl overflow-hidden bg-[#111113] aspect-[4/3] flex items-center justify-center">
            <MediaImage
              src={item.images[activeSlide]}
              alt={item.title}
              className="w-full h-full max-h-[560px] object-contain"
            />
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="上一张"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="下一张"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black/55 text-white text-[12px] font-mono tabular-nums">
                  {activeSlide + 1} / {total}
                </div>
              </>
            )}
          </div>

          {total > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.images.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={`w-16 h-11 rounded-lg overflow-hidden border-2 transition-all ${
                    activeSlide === idx
                      ? 'border-[#0071E3]'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <MediaImage src={imgUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <p className="text-[14px] text-[#424245] leading-relaxed whitespace-pre-line">
              {item.body || '暂无图文配文描述'}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F2F2F7] flex items-center justify-between text-[12px] text-[#86868B] tabular-nums">
            <span>作者：{item.authorName}</span>
            <span>
              {formatNumber(item.views)} 浏览 · {formatNumber(item.likes)} 赞
            </span>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
