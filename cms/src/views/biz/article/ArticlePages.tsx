import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { api, convertToWebp, uploadFileWithProgress } from '../../../lib/api.ts';
import {
  deleteFilesByUrls,
  removedUrls,
  resourceUrlsInHtml,
  toOpenUrl,
  type DevFile,
} from '../../../lib/fileCenter.ts';
import { createBlobUploadQueue, type BlobUploadQueue } from '../../../lib/pendingUpload.ts';
import { formatDateShort, formatNumber } from '../../../lib/format.ts';
import { plainText, renderRichContent } from '../../../lib/richtext.tsx';
import { publishCategoryName, resolvePublishCategoryCode } from '../../../lib/category.ts';
import { usePublishCategories } from '../../../lib/usePublishCategories.ts';
import type { ArticleItem, ContentStatus } from '../../../types/cms.ts';
import { MediaImage } from '../../../components/MediaImage.tsx';
import { CategorySelect } from '../../../components/CategorySelect.tsx';
import { FilePicker } from '../../../components/FilePicker.tsx';
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
            {status === 'published' ? '已发布' : '私密'}
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
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? 'published');
  const [saveProgress, setSaveProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // 正文图片延迟上传队列：编辑时用 blob 预览，保存时统一上传并替换地址
  const bodyQueueRef = useRef<BlobUploadQueue | null>(null);
  if (!bodyQueueRef.current) bodyQueueRef.current = createBlobUploadQueue();

  // 离开页面时释放正文图片的预览地址
  useEffect(() => () => bodyQueueRef.current?.reset(), []);

  const {
    options: categoryOptions,
    loading: categoryLoading,
    error: categoryError,
  } = usePublishCategories('ARTICLE');

  // 历史数据可能存的是分类名称，加载后端分类后统一换成编码；
  // 匹配不到时保留原值（可能是刚新建、列表尚未刷新到的分类），避免被清空
  useEffect(() => {
    if (categoryLoading || !category) return;
    const resolved = resolvePublishCategoryCode(categoryOptions, category);
    if (resolved && resolved !== category) setCategory(resolved);
  }, [category, categoryLoading, categoryOptions]);

  const categoryLabel = publishCategoryName(categoryOptions, category);

  // HTML 正文需按纯文本统计字数（避免把标签计入）
  const liveWordCount = useMemo(() => plainText(content).length, [content]);
  const liveReadMin = Math.max(1, Math.ceil(liveWordCount / 300));

  /** 从全局文件选择器选取封面，文件已在文件中心落库 */
  function handleCoverSelect(files: DevFile[]) {
    const file = files[0];
    if (!file) return;
    setCoverUrl(toOpenUrl(file));
    setFormError('');
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
    // 新建分类后本页的 categoryOptions（独立的 hook 实例）可能尚未刷新，
    // resolvePublishCategoryCode 查不到会返回空；此时 category state 已是新分类 code，
    // 直接沿用，避免误判为「未选择分类」。
    const resolved = resolvePublishCategoryCode(categoryOptions, category);
    const finalCategory = resolved || category.trim();
    if (!finalCategory) {
      setFormError(categoryError || '请选择文章分类');
      return;
    }
    if (!coverUrl.trim()) {
      setFormError('请选择文章封面');
      return;
    }
    setSaving(true);
    setFormError('');
    // 队列在组件挂载时即创建，这里断言非空便于后续使用
    const bodyQueue = bodyQueueRef.current!;
    setSaveProgress(bodyQueue.size() ? 0 : null);
    try {
      // 封面已由文件选择器上传落库，这里只需等待正文里暂存的资源上传完成
      const finalCoverUrl = coverUrl.trim();
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
        // 保存成功后彻底删除被替换的封面、正文图片/视频等不再引用的资源
        void deleteFilesByUrls(
          removedUrls(
            [item.coverUrl, ...resourceUrlsInHtml(item.content)],
            [finalCoverUrl, ...resourceUrlsInHtml(finalContent)]
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
              <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
                文章封面 <span className="text-[#FF3B30]">*</span>
              </label>
              <div className="aspect-[16/9] rounded-xl overflow-hidden bg-[#E5E5EA]">
                <MediaImage
                  src={coverUrl}
                  alt="文章封面"
                  fallbackLabel="请选择文章封面"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setCoverPickerOpen(true)}
                className="mt-2.5 w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5EA] text-[12px] font-medium text-[#1D1D1F] hover:bg-[#FAFAFA] inline-flex items-center justify-center gap-1.5"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>{coverUrl ? '重新选择文章封面' : '从文件中心选择封面'}</span>
              </button>
              <p className="text-[11px] text-[#86868B] mt-1.5">
                封面必填，可直接从全局文件中心选取或上传新图片
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
                  存为私密
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
                // AIEditor 里点击图片/视频上传后立即存入文件中心，正文直接保存真实地址
                uploadMedia={async (file, _type, onProgress) => {
                  const uploaded = await uploadFileWithProgress(file, onProgress);
                  return uploaded.url;
                }}
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
            coverUrl={coverUrl}
            status={status}
            wordCount={liveWordCount}
            readMin={liveReadMin}
          />
        )}
        />
      <FilePicker
        open={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        accept="image"
        title="选择文章封面"
        beforeUpload={convertToWebp}
        onSelect={handleCoverSelect}
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
export function ArticleReaderPage({ item, onBack }: ArticleReaderPageProps) {
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
