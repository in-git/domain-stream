import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { api, uploadFileWithProgress } from '../../../lib/api.ts';
import { deleteFilesByUrls, imageUrlsInHtml, removedUrls } from '../../../lib/fileCenter.ts';
import { createBlobUploadQueue, type BlobUploadQueue } from '../../../lib/pendingUpload.ts';
import { formatDateShort, formatNumber } from '../../../lib/format.ts';
import { plainText, renderRichContent } from '../../../lib/richtext.tsx';
import { publishCategoryName, resolvePublishCategoryCode } from '../../../lib/category.ts';
import { usePublishCategories } from '../../../lib/usePublishCategories.ts';
import type { ArticleItem, ContentStatus } from '../../../types/cms.ts';
import { MediaImage } from '../../../components/MediaImage.tsx';
import { CategorySelect } from '../../../components/CategorySelect.tsx';
import { CoverCropper } from '../../../components/CoverCropper.tsx';
import { PageShell } from '../../../components/PageShell.tsx';
import {
  EditorWorkspace,
  type PreviewDevice,
} from '../../../components/EditorWorkspace.tsx';

// 富文本编辑器体积较大，按写作页懒加载，避免拖慢列表/首屏
const AiRichEditor = lazy(() =>
  import('../../../components/AiRichEditor.tsx').then((m) => ({ default: m.AiRichEditor }))
);

interface ArticlePreviewProps {
  device: PreviewDevice;
  title: string;
  summary: string;
  content: string;
  category: string;
  coverUrl: string;
  status: ContentStatus;
  wordCount: number;
  readMin: number;
}

/** 右侧实时预览：文章排版按设备宽度自适应 */
function ArticlePreview({
  device,
  title,
  summary,
  content,
  category,
  coverUrl,
  status,
  wordCount,
  readMin,
}: ArticlePreviewProps) {
  const compact = device === 'mobile';
  return (
    <div className="bg-white">
      <div className="aspect-[16/9] bg-[#F2F2F7] overflow-hidden">
        <MediaImage
          src={coverUrl}
          alt="文章封面预览"
          fallbackLabel="文章封面预览"
          className="w-full h-full object-cover"
        />
      </div>
      <div className={compact ? 'p-5' : 'p-7'}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6E6E73] tabular-nums">
          <span className="truncate">
            {category || '未分类'} · 刚刚 · {wordCount} 字 · 约 {readMin} 分钟阅读
          </span>
          <span
            className={`font-medium shrink-0 ${
              status === 'published' ? 'text-[#16A34A]' : 'text-[#D97706]'
            }`}
          >
            {status === 'published' ? '已发布' : '草稿'}
          </span>
        </div>
        <h2
          className={`${compact ? 'text-[20px]' : 'text-[24px]'} font-semibold tracking-tight text-[#1D1D1F] leading-snug mt-2`}
        >
          {title || '未命名文章'}
        </h2>
        <p className="mt-3 text-[13px] text-[#6E6E73] leading-relaxed">
          {summary || '暂无导语摘要'}
        </p>
        <hr className="my-5 border-[#E5E5EA]" />
        {content.trim() ? (
          renderRichContent(content, compact)
        ) : (
          <p className="text-[13px] text-[#86868B]">暂无正文内容可预览</p>
        )}
      </div>
    </div>
  );
}

interface ArticleEditorPageProps {
  item?: ArticleItem;
  onSaved: () => Promise<void>;
  onBack: () => void;
}

/** 文章新建 / 编辑独立页面（原写作弹窗） */
export function ArticleEditorPage({ item, onSaved, onBack }: ArticleEditorPageProps) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [summary, setSummary] = useState(item?.summary ?? '');
  const [content, setContent] = useState(item?.content ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [coverUrl, setCoverUrl] = useState(item?.coverUrl ?? '');
  // 封面裁剪结果先暂存在本地，点击保存时才上传
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(item?.coverUrl ?? '');
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? 'published');
  // 选中的原始文件，等裁剪确认后再本地暂存
  const [coverDraft, setCoverDraft] = useState<File | null>(null);
  const [saveProgress, setSaveProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverPreviewRef = useRef('');
  // 正文图片延迟上传队列：编辑时用 blob 预览，保存时统一上传并替换地址
  const bodyQueueRef = useRef<BlobUploadQueue | null>(null);
  if (!bodyQueueRef.current) bodyQueueRef.current = createBlobUploadQueue();

  // 离开页面时释放本地封面与正文图片的预览地址
  useEffect(
    () => () => {
      if (coverPreviewRef.current) URL.revokeObjectURL(coverPreviewRef.current);
      bodyQueueRef.current?.reset();
    },
    []
  );

  const {
    options: categoryOptions,
    loading: categoryLoading,
    error: categoryError,
  } = usePublishCategories('ARTICLE');

  // 历史数据可能存的是分类名称，加载后端分类后统一换成编码
  useEffect(() => {
    if (categoryLoading || !category) return;
    const resolved = resolvePublishCategoryCode(categoryOptions, category);
    if (resolved !== category) setCategory(resolved);
  }, [category, categoryLoading, categoryOptions]);

  const categoryLabel = publishCategoryName(categoryOptions, category);

  // HTML 正文需按纯文本统计字数（避免把标签计入）
  const liveWordCount = useMemo(() => plainText(content).length, [content]);
  const liveReadMin = Math.max(1, Math.ceil(liveWordCount / 300));

  /** 选择原始图片 → 先进入 16:9 裁剪弹窗，确认后只在本地暂存 */
  function handleCoverPick(file: File) {
    if (!file.type.startsWith('image/')) {
      setFormError('封面图片仅支持 JPG / PNG / WebP');
      return;
    }
    setFormError('');
    setCoverDraft(file);
  }

  /** 裁剪完成后暂存到本地，点击保存时才上传 */
  function handleCoverUpload(cropped: File) {
    setFormError('');
    if (coverPreviewRef.current) {
      URL.revokeObjectURL(coverPreviewRef.current);
      coverPreviewRef.current = '';
    }
    const previewUrl = URL.createObjectURL(cropped);
    coverPreviewRef.current = previewUrl;
    setCoverFile(cropped);
    setCoverPreviewUrl(previewUrl);
    setCoverDraft(null);
  }

  async function handleSave() {
    if (!title.trim()) {
      setFormError('请输入文章标题');
      return;
    }
    const plain = plainText(content);
    if (!plain) {
      setFormError('请输入文章正文内容');
      return;
    }
    const finalCategory = resolvePublishCategoryCode(categoryOptions, category);
    if (!finalCategory) {
      setFormError(categoryError || '请选择文章分类');
      return;
    }
    setSaving(true);
    setFormError('');
    // 队列在组件挂载时即创建，这里断言非空便于后续使用
    const bodyQueue = bodyQueueRef.current!;
    setSaveProgress(coverFile || bodyQueue.size() ? 0 : null);
    try {
      // 保存时才上传：先封面，再正文里暂存的图片
      let uploadedCoverUrl = '';
      if (coverFile) {
        const uploaded = await uploadFileWithProgress(coverFile, (pct) => setSaveProgress(pct));
        uploadedCoverUrl = uploaded.url;
        setCoverUrl(uploaded.url);
        // 已上传成功则置空，保存失败重试时不会再重复上传
        setCoverFile(null);
      }
      const finalCoverUrl =
        uploadedCoverUrl ||
        coverUrl ||
        '/src/assets/images/article_cover_typography_1795026087411.jpg';
      const finalContent = await bodyQueue.flush(content, (pct) => setSaveProgress(pct));
      if (finalContent !== content) setContent(finalContent);

      const payload: Partial<ArticleItem> = {
        title: title.trim(),
        summary: summary.trim() || plain.slice(0, 80),
        content: finalContent.trim(),
        category: finalCategory,
        coverUrl: finalCoverUrl,
        status,
      };
      if (item) {
        await api.updateArticle(item.id, payload);
        // 保存成功后彻底删除被替换的封面，以及正文中被移除的图片，避免留下孤儿文件
        void deleteFilesByUrls(
          removedUrls(
            [item.coverUrl, ...imageUrlsInHtml(item.content)],
            [finalCoverUrl, ...imageUrlsInHtml(finalContent)]
          )
        );
      } else {
        await api.createArticle(payload);
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
    <>
      <EditorWorkspace
        title={item ? '编辑专栏文章' : '撰写新文章'}
        subtitle={`当前 ${formatNumber(liveWordCount)} 字 · 预计阅读 ${liveReadMin} 分钟`}
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
              disabled={saving}
              onClick={() => void handleSave()}
              className="h-10 px-5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-60 text-white text-[13px] font-medium"
            >
              {saving
                ? saveProgress !== null
                  ? `正在上传 ${saveProgress}%`
                  : '正在保存...'
                : item
                  ? '保存更新'
                  : '发布文章'}
            </button>
          </>
        }
        info={
          <div className="space-y-5">
            <div>
              <div className="aspect-[16/9] rounded-xl overflow-hidden bg-[#E5E5EA]">
                <MediaImage
                  src={coverPreviewUrl}
                  alt="文章封面"
                  fallbackLabel="文章封面"
                  className="w-full h-full object-cover"
                />
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) handleCoverPick(f);
                }}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="mt-2.5 w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5EA] text-[12px] font-medium text-[#1D1D1F] hover:bg-[#FAFAFA] inline-flex items-center justify-center gap-1.5"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>
                  {coverPreviewUrl ? '重新选择并裁剪' : '选择文章封面'}
                </span>
              </button>
              <p className="text-[11px] text-[#86868B] mt-1.5">
                选图后可拖动框选裁剪区域，保存文章时才会上传
              </p>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">文章标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入具有吸引力的文章标题"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[15px] font-medium"
              />
            </div>

            <CategorySelect
              module="ARTICLE"
              value={category}
              onChange={setCategory}
              label="文章分类"
              required
              ariaLabel="文章分类"
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

            <div>
              <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">导语摘要</label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="一句话概括文章核心观点（留空将自动截取正文前段）"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[14px] resize-none"
              />
            </div>

            {formError && (
              <div className="rounded-xl bg-[#FF3B30]/8 px-3.5 py-2 text-[13px] text-[#D70015]">
                {formError}
              </div>
            )}
          </div>
        }
        editor={
          <div className="relative h-full min-h-0 rounded-xl overflow-hidden border border-[#E5E5EA] bg-white">
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-[#F5F5F7] text-[13px] text-[#86868B]">
                  正在加载富文本编辑器...
                </div>
              }
            >
              <AiRichEditor
                value={content}
                onChange={setContent}
                className="article-ai-editor absolute inset-0"
                style={{ height: '100%' }}
                // 正文图片先插入本地 blob 地址，保存文章时统一上传并替换
                uploadImage={(file) =>
                  Promise.resolve(
                    bodyQueueRef.current?.register(file) ?? URL.createObjectURL(file)
                  )
                }
              />
            </Suspense>
          </div>
        }
        preview={(device) => (
          <ArticlePreview
            device={device}
            title={title}
            summary={summary}
            content={content}
            category={categoryLabel}
            coverUrl={coverPreviewUrl}
            status={status}
            wordCount={liveWordCount}
            readMin={liveReadMin}
          />
        )}
        />
      <CoverCropper
        file={coverDraft}
        aspect={16 / 9}
        outputWidth={1440}
        heading="裁剪文章封面"
        onCancel={() => setCoverDraft(null)}
        onComplete={handleCoverUpload}
      />
    </>
  );
}

interface ArticleReaderPageProps {
  item: ArticleItem;
  onRefresh: () => Promise<void>;
  onBack: () => void;
}

/** 文章阅读独立页面（原阅读弹窗） */
export function ArticleReaderPage({ item, onRefresh, onBack }: ArticleReaderPageProps) {
  useEffect(() => {
    void api.trackView('article', item.id).then(() => onRefresh());
  }, [item.id, onRefresh]);

  return (
    <PageShell
      title={item.title}
      subtitle={`${item.category} · ${formatDateShort(item.updatedAt)} · ${item.authorName} · 约 ${item.readTimeMin} 分钟阅读`}
      onBack={onBack}
      maxWidth="max-w-[820px]"
      hero={
        <div className="h-56 sm:h-72 bg-[#F2F2F7]">
          <MediaImage
            src={item.coverUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      }
    >
      <p className="text-[15px] text-[#6E6E73] leading-relaxed">{item.summary}</p>
      <hr className="my-6 border-[#E5E5EA]" />
      <div>{renderRichContent(item.content)}</div>
      <div className="mt-8 pt-4 border-t border-[#E5E5EA] text-[12px] text-[#86868B] tabular-nums">
        {formatNumber(item.views)} 阅读
      </div>
    </PageShell>
  );
}
