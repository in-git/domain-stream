import { useEffect, useRef, useState, type DragEvent } from 'react';
import { CheckCircle2, UploadCloud } from 'lucide-react';
import { api, convertToWebp, uploadFileWithProgress } from '../lib/api.ts';
import { publishCategoryName, resolvePublishCategoryCode } from '../lib/category.ts';
import { usePublishCategories } from '../lib/usePublishCategories.ts';
import {
  formatDateShort,
  formatDuration,
  formatFileSize,
  formatNumber,
} from '../lib/format.ts';
import type { ContentStatus, VideoItem } from '../types/cms.ts';
import { MediaImage } from './MediaImage.tsx';
import { PageShell } from './PageShell.tsx';
import {
  EditorWorkspace,
  type PreviewDevice,
} from './EditorWorkspace.tsx';

/** 视频最大上传体积：1 GB */
const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;

interface VideoPreviewProps {
  device: PreviewDevice;
  title: string;
  description: string;
  category: string;
  status: ContentStatus;
  coverUrl: string;
  videoUrl: string;
  durationSec: number;
  resolution: string;
}

/** 右侧实时预览：按设备宽度自适应排版 */
function VideoPreview({
  device,
  title,
  description,
  category,
  status,
  coverUrl,
  videoUrl,
  durationSec,
  resolution,
}: VideoPreviewProps) {
  const compact = device === 'mobile';
  return (
    <div className="bg-white">
      <div className="relative aspect-video bg-black overflow-hidden">
        <MediaImage
          src={coverUrl}
          alt="视频封面预览"
          fallbackLabel="视频封面预览"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center text-[#1D1D1F] shadow-md">
            <svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5 fill-current" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/95 font-mono tabular-nums">
          <span>{resolution || '1920×1080'}</span>
          <span>{formatDuration(durationSec)}</span>
        </div>
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
          {title || '未命名视频'}
        </h3>
        <p className="mt-2 text-[13px] text-[#6E6E73] leading-relaxed whitespace-pre-line">
          {description || '暂无视频简介说明'}
        </p>
        <div className="mt-3 pt-3 border-t border-[#F2F2F7] text-[11px] text-[#86868B] tabular-nums">
          {videoUrl ? '媒体文件已就绪' : '等待上传视频文件'} · 0 次播放
        </div>
      </div>
    </div>
  );
}

interface VideoEditorPageProps {
  item?: VideoItem;
  onSaved: () => Promise<void>;
  onBack: () => void;
}

/** 视频新建 / 编辑独立页面（原上传编辑弹窗） */
export function VideoEditorPage({ item, onSaved, onBack }: VideoEditorPageProps) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? 'published');
  const [videoUrl, setVideoUrl] = useState(item?.videoUrl ?? '');
  const [coverUrl, setCoverUrl] = useState(item?.coverUrl ?? '');
  const [durationSec, setDurationSec] = useState(item?.durationSec ?? 120);
  const [resolution, setResolution] = useState(item?.resolution ?? '1920×1080');
  const [fileSizeBytes, setFileSizeBytes] = useState(item?.fileSizeBytes ?? 0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [formError, setFormError] = useState('');

  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const {
    options: categoryOptions,
    loading: categoryLoading,
    error: categoryError,
  } = usePublishCategories('VIDEO');

  // 历史数据可能存的是分类名称，加载后端分类后统一换成编码
  useEffect(() => {
    if (categoryLoading || !category) return;
    const resolved = resolvePublishCategoryCode(categoryOptions, category);
    if (resolved !== category) setCategory(resolved);
  }, [category, categoryLoading, categoryOptions]);

  const categoryLabel = publishCategoryName(categoryOptions, category);

  async function extractVideoMetadataAndFrame(file: File): Promise<{
    duration: number;
    resolution: string;
    coverBlob: Blob | null;
  }> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.muted = true;
      vid.playsInline = true;
      vid.src = url;

      const cleanup = () => URL.revokeObjectURL(url);

      vid.onloadedmetadata = () => {
        const dur = Number.isFinite(vid.duration) ? Math.round(vid.duration) : 60;
        const res =
          vid.videoWidth && vid.videoHeight
            ? `${vid.videoWidth}×${vid.videoHeight}`
            : '1920×1080';
        vid.currentTime = Math.min(1, dur * 0.1);

        vid.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = vid.videoWidth || 1280;
            canvas.height = vid.videoHeight || 720;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
              canvas.toBlob(
                (blob) => {
                  cleanup();
                  resolve({ duration: dur, resolution: res, coverBlob: blob });
                },
                'image/jpeg',
                0.85
              );
              return;
            }
          } catch {
            // fallback without frame capture
          }
          cleanup();
          resolve({ duration: dur, resolution: res, coverBlob: null });
        };
      };

      vid.onerror = () => {
        cleanup();
        resolve({ duration: 60, resolution: '1920×1080', coverBlob: null });
      };
    });
  }

  async function handleVideoFile(file: File) {
    if (!file.type.startsWith('video/')) {
      setFormError('请选择 MP4、MOV 或 WebM 格式的视频文件');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setFormError('视频文件不能超过 1 GB');
      return;
    }
    setFormError('');
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    setUploadProgress(5);
    try {
      const metaPromise = extractVideoMetadataAndFrame(file);
      const uploaded = await uploadFileWithProgress(file, (pct) => {
        setUploadProgress(pct);
      });
      setVideoUrl(uploaded.url);
      setFileSizeBytes(uploaded.size);
      // 视频上传成功后自动打开预览窗口
      setPreviewOpen(true);

      const meta = await metaPromise;
      setDurationSec(meta.duration || 60);
      setResolution(meta.resolution);

      if (!coverUrl && meta.coverBlob) {
        const thumbFile = new File([meta.coverBlob], 'auto-cover.jpg', { type: 'image/jpeg' });
        const webpCover = await convertToWebp(thumbFile);
        const uploadedCover = await uploadFileWithProgress(webpCover);
        setCoverUrl(uploadedCover.url);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '视频上传失败');
      setUploadProgress(null);
    }
  }

  async function handleCoverFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setFormError('封面仅支持 JPG / PNG / WebP 图片');
      return;
    }
    setCoverUploading(true);
    setFormError('');
    try {
      const webpFile = await convertToWebp(file);
      const uploaded = await uploadFileWithProgress(webpFile);
      setCoverUrl(uploaded.url);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '封面上传失败');
    } finally {
      setCoverUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleVideoFile(file);
  }

  async function handleSave() {
    if (!title.trim()) {
      setFormError('请填写视频标题');
      return;
    }
    if (!description.trim()) {
      setFormError('请填写视频简介');
      return;
    }
    if (!videoUrl) {
      setFormError('请上传视频文件');
      return;
    }
    if (!coverUrl) {
      setFormError('请上传或选择视频封面');
      return;
    }
    const finalCategory = resolvePublishCategoryCode(categoryOptions, category);
    if (!finalCategory) {
      setFormError(categoryError || '请选择所属分类');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: Partial<VideoItem> = {
        title: title.trim(),
        description: description.trim(),
        category: finalCategory,
        status,
        videoUrl,
        coverUrl,
        durationSec,
        resolution,
        fileSizeBytes,
      };
      if (item) {
        await api.updateVideo(item.id, payload);
      } else {
        await api.createVideo(payload);
      }
      await onSaved();
      onBack();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorWorkspace
      title={item ? '编辑视频信息' : '上传新视频'}
      subtitle="支持拖拽视频直传，系统自动读取时长、分辨率并截取视频封面"
      onBack={onBack}
      previewOpen={previewOpen}
      onPreviewOpenChange={setPreviewOpen}
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
            {saving ? '正在保存...' : item ? '保存更改' : '确认发布'}
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
          onClick={() => videoInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-7 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-[#0071E3] bg-[#0071E3]/5'
              : 'border-[#D1D1D6] bg-[#F5F5F7]/70 hover:bg-[#F5F5F7]'
          }`}
        >
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleVideoFile(f);
            }}
          />
          <UploadCloud className="w-8 h-8 text-[#0071E3] mx-auto mb-2" strokeWidth={1.6} />
          <div className="text-[14px] font-medium text-[#1D1D1F]">
            {videoUrl ? '已选择视频文件，点击或拖拽可替换' : '点击选择或拖拽视频文件至此'}
          </div>
          <div className="text-[12px] text-[#86868B] mt-1">
            支持 MP4、MOV、WebM · 最大 1 GB <span className="text-[#D70015]">*</span>
          </div>

          {uploadProgress !== null && (
            <div className="mt-4 max-w-[340px] mx-auto">
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-[#1D1D1F] font-medium">
                  {uploadProgress === 100 ? '视频上传完成' : '正在上传视频...'}
                </span>
                <span className="font-mono tabular-nums text-[#0071E3]">{uploadProgress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#E5E5EA] overflow-hidden">
                <div
                  className="h-full bg-[#0071E3] transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {videoUrl && uploadProgress === null && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#16A34A]">
              <CheckCircle2 className="w-4 h-4" />
              <span>媒体文件已就绪 · {formatDuration(durationSec)} · {resolution}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-2xl bg-[#F5F5F7]">
          <div className="w-36 aspect-video rounded-xl overflow-hidden bg-[#E5E5EA] shrink-0">
            <MediaImage
              src={coverUrl}
              alt="视频封面预览"
              fallbackLabel="自动生成封面"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#1D1D1F]">
              视频封面图 <span className="text-[#D70015]">*</span>
            </div>
            <p className="text-[12px] text-[#6E6E73] mt-0.5">
              上传视频后会自动截取精彩帧作为封面，也可手动上传高清海报图。
            </p>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCoverFile(f);
              }}
            />
            <button
              type="button"
              disabled={coverUploading}
              onClick={() => coverInputRef.current?.click()}
              className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5EA] text-[12px] font-medium text-[#1D1D1F] hover:bg-[#FAFAFA]"
            >
              {coverUploading ? '正在上传封面...' : '更换封面图片'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
            视频标题 <span className="text-[#D70015]">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入简洁明了的视频标题"
            className="w-full h-10 px-3.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[14px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
              所属分类 <span className="text-[#D70015]">*</span>
            </label>
            <select
              value={category}
              disabled={categoryLoading || !!categoryError}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] text-[14px] text-[#1D1D1F] focus:bg-white focus:outline-none disabled:opacity-60"
            >
              <option value="">
                {categoryLoading
                  ? '正在加载分类...'
                  : categoryError
                    ? '分类加载失败'
                    : '请选择分类'}
              </option>
              {categoryOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            {categoryError && (
              <p className="mt-1 text-[11px] text-[#D70015]">{categoryError}，请稍后重试</p>
            )}
          </div>
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
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
            内容简介 <span className="text-[#D70015]">*</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="补充拍摄背景、要点或创作者说明..."
            className="w-full p-3.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[14px] resize-none"
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
        <VideoPreview
          device={device}
          title={title}
          description={description}
          category={categoryLabel}
          status={status}
          coverUrl={coverUrl}
          videoUrl={videoUrl}
          durationSec={durationSec}
          resolution={resolution}
        />
      )}
    />
  );
}

interface VideoViewPageProps {
  item: VideoItem;
  onRefresh: () => Promise<void>;
  onBack: () => void;
}

/** 视频播放独立页面（原播放弹窗） */
export function VideoViewPage({ item, onRefresh, onBack }: VideoViewPageProps) {
  useEffect(() => {
    void api.trackView('video', item.id).then(() => onRefresh());
  }, [item.id, onRefresh]);

  return (
    <PageShell
      title={item.title}
      subtitle={`${item.category} · ${item.resolution} · ${formatDuration(item.durationSec)}`}
      onBack={onBack}
      maxWidth="max-w-[900px]"
    >
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
        {item.videoUrl ? (
          <video
            src={item.videoUrl}
            poster={item.coverUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
          />
        ) : (
          <>
            <MediaImage
              src={item.coverUrl}
              alt={item.title}
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col items-center justify-center text-white px-6 text-center">
              <div className="px-4 py-2 rounded-xl bg-black/50 backdrop-blur-md text-[13px]">
                示例演示条目 · 可点击「编辑视频」传入本地 MP4/MOV 实现原生播放
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#6E6E73] tabular-nums">
        <span>
          {formatDateShort(item.updatedAt)} · {item.authorName}
        </span>
        <span>
          {formatNumber(item.views)} 次播放 · {formatFileSize(item.fileSizeBytes)}
        </span>
      </div>
      <p className="mt-3 text-[14px] text-[#424245] leading-relaxed whitespace-pre-line">
        {item.description || '暂无视频简介说明'}
      </p>
    </PageShell>
  );
}
