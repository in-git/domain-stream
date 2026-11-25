import { useEffect, useRef, useState, type DragEvent, type RefObject } from 'react';
import { Camera, CheckCircle2, RotateCcw, Trash2, UploadCloud } from 'lucide-react';
import { api, convertToWebp } from '../../../lib/api.ts';
import {
  deleteFilesByUrls,
  removedUrls,
  toPlayableVideoUrl,
} from '../../../lib/fileCenter.ts';
import { uploadTaskQueue } from '../../../lib/uploadTaskQueue.ts';
import { publishCategoryName, resolvePublishCategoryCode } from '../../../lib/category.ts';
import { usePublishCategories } from '../../../lib/usePublishCategories.ts';
import {
  extractVideoMetadataAndFrame,
  titleFromFileName,
} from '../../../lib/videoDrop.ts';
import { MAX_VIDEO_SIZE } from '../../../lib/videoConstants.ts';
import {
  formatDateShort,
  formatDuration,
  formatFileSize,
  formatNumber,
} from '../../../lib/format.ts';
import type { ContentStatus, VideoItem } from '../../../types/cms.ts';
import { CategorySelect } from '../../../components/CategorySelect.tsx';
import { MediaImage } from '../../../components/MediaImage.tsx';
import { PageShell } from '../../../components/PageShell.tsx';
import {
  EditorWorkspace,
  type PreviewDevice,
} from '../../../components/EditorWorkspace.tsx';

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
  videoRef?: RefObject<HTMLVideoElement | null>;
  onCaptureCover?: () => void;
  capturingCover?: boolean;
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
  videoRef,
  onCaptureCover,
  capturingCover,
}: VideoPreviewProps) {
  const compact = device === 'mobile';
  const playableVideoUrl = toPlayableVideoUrl(videoUrl);
  return (
    <div className="bg-white">
      <div className="relative aspect-video bg-black overflow-hidden">
        {playableVideoUrl ? (
          // 有视频源时渲染真实播放器，可直接在预览区播放
          <>
            <video
              ref={videoRef}
              src={playableVideoUrl}
              poster={coverUrl || undefined}
              controls
              playsInline
              className="absolute inset-0 w-full h-full bg-black object-contain"
            />
            {onCaptureCover && (
              <button
                type="button"
                onClick={onCaptureCover}
                disabled={capturingCover}
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-black/65 px-3 py-2 text-[12px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/80 disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
                {capturingCover ? '截取中…' : '截取封面'}
              </button>
            )}
          </>
        ) : (
          <>
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
  /** 从首页/列表拖拽单个视频进入时，自动填入表单并截取封面 */
  initialVideoFile?: File | null;
  onInitialFileConsumed?: () => void;
  onSaved: () => Promise<void>;
  onBack: () => void;
}

/** 视频新建 / 编辑独立页面（原上传编辑弹窗） */
export function VideoEditorPage({
  item,
  initialVideoFile,
  onInitialFileConsumed,
  onSaved,
  onBack,
}: VideoEditorPageProps) {
  const [title, setTitle] = useState(
    item?.title ?? (initialVideoFile ? titleFromFileName(initialVideoFile.name) : '')
  );
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? 'published');
  const [videoUrl, setVideoUrl] = useState(item?.videoUrl ?? '');
  const [coverUrl, setCoverUrl] = useState(item?.coverUrl ?? '');
  // 选中的视频/封面文件先暂存在本地，点击保存时才上传
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(item?.videoUrl ?? '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(item?.coverUrl ?? '');
  const [videoFileName, setVideoFileName] = useState('');
  const [durationSec, setDurationSec] = useState(item?.durationSec ?? 120);
  const [resolution, setResolution] = useState(item?.resolution ?? '1920×1080');
  const [fileSizeBytes, setFileSizeBytes] = useState(item?.fileSizeBytes ?? 0);
  // 默认打开预览窗口，与编辑工作区保持一致
  const [previewOpen, setPreviewOpen] = useState(true);
  const [coverProcessing, setCoverProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [formError, setFormError] = useState('');

  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [capturingCover, setCapturingCover] = useState(false);
  // 记录尚未上传的本地预览地址，离开页面时统一释放
  const localPreviewUrlsRef = useRef<Set<string>>(new Set());

  useEffect(
    () => () => {
      localPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      localPreviewUrlsRef.current.clear();
    },
    []
  );

  const consumedInitialFileRef = useRef<File | null>(null);
  useEffect(() => {
    if (!initialVideoFile || consumedInitialFileRef.current === initialVideoFile) return;
    consumedInitialFileRef.current = initialVideoFile;
    void handleVideoFile(initialVideoFile).finally(() => onInitialFileConsumed?.());
  }, [initialVideoFile, onInitialFileConsumed]);

  /** 生成本地预览地址并登记，便于替换/卸载时释放 */
  function trackLocalPreview(file: File): string {
    const url = URL.createObjectURL(file);
    localPreviewUrlsRef.current.add(url);
    return url;
  }

  function releaseLocalPreview(url: string) {
    if (!url || !localPreviewUrlsRef.current.has(url)) return;
    localPreviewUrlsRef.current.delete(url);
    URL.revokeObjectURL(url);
  }

  const {
    options: categoryOptions,
    loading: categoryLoading,
    error: categoryError,
  } = usePublishCategories('VIDEO');

  // 历史数据可能存的是分类名称，加载后端分类后统一换成编码；
  // 匹配不到时保留原值（可能是刚新建、列表尚未刷新到的分类），避免被清空
  useEffect(() => {
    if (categoryLoading || !category) return;
    const resolved = resolvePublishCategoryCode(categoryOptions, category);
    if (resolved && resolved !== category) setCategory(resolved);
  }, [category, categoryLoading, categoryOptions]);

  const categoryLabel = publishCategoryName(categoryOptions, category);

  /** 封面同样只在本地暂存，保存时才上传 */
  function applyCoverFile(file: File) {
    releaseLocalPreview(coverPreviewUrl);
    setCoverFile(file);
    setCoverPreviewUrl(trackLocalPreview(file));
  }

  /** 从预览视频当前帧生成封面，统一转 WebP 后作为待上传封面 */
  async function captureCoverFromPreview() {
    const video = previewVideoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setFormError('请先播放视频，再点击截取封面');
      return;
    }
    setCapturingCover(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('当前浏览器不支持画面截取');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92)
      );
      if (!blob) throw new Error('截取失败，请换一帧重试');
      const frame = new File([blob], `video-frame-${Date.now()}.jpg`, { type: 'image/jpeg' });
      applyCoverFile(await convertToWebp(frame, 0.9));
      setFormError('');
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'SecurityError'
          ? '视频源不允许截取画面，请改用本地上传的视频'
          : error instanceof Error
            ? error.message
            : '截取封面失败';
      setFormError(message);
    } finally {
      setCapturingCover(false);
    }
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

    // 只做本地暂存与本地解析，不上传
    releaseLocalPreview(videoPreviewUrl);
    setVideoFile(file);
    setVideoPreviewUrl(trackLocalPreview(file));
    setVideoFileName(file.name);
    setFileSizeBytes(file.size);
    // 新选择的视频会替换旧的远端地址，避免保存时误用历史文件
    setVideoUrl('');
    // 选择本地视频后自动打开预览窗口
    setPreviewOpen(true);

    try {
      const meta = await extractVideoMetadataAndFrame(file);
      setDurationSec(meta.duration || 60);
      setResolution(meta.resolution);

      // 自动截取的首帧同样先本地暂存为封面，已有封面时不覆盖
      if (!coverFile && meta.coverBlob) {
        const thumbFile = new File([meta.coverBlob], 'auto-cover.jpg', { type: 'image/jpeg' });
        applyCoverFile(await convertToWebp(thumbFile));
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '视频信息读取失败');
    }
  }

  async function handleCoverFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setFormError('封面仅支持 JPG / PNG / WebP 图片');
      return;
    }
    setCoverProcessing(true);
    setFormError('');
    try {
      applyCoverFile(await convertToWebp(file));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '封面处理失败');
    } finally {
      setCoverProcessing(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    // 多文件或文件夹交给根布局的全局拖拽处理，走批量上传表格
    if (e.dataTransfer.items.length > 1 || e.dataTransfer.files.length > 1) {
      setDragOver(false);
      return;
    }
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleVideoFile(file);
  }

  /** 是否存在需要上传的本地文件（决定按钮文案） */
  function uploadsPending() {
    return !!videoFile || !!coverFile;
  }

  /** 是否已有上传到服务器的文件（videoUrl 为远端地址，本地待上传的 videoFile 不算） */
  function hasUploadedFiles() {
    return !!videoUrl || !!coverUrl;
  }

  /** 清空表单：释放本地预览、重置所有字段与文件输入，不删除服务器文件 */
  function handleClearForm() {
    releaseLocalPreview(videoPreviewUrl);
    releaseLocalPreview(coverPreviewUrl);
    setTitle('');
    setDescription('');
    setCategory('');
    setStatus('published');
    setVideoFile(null);
    setVideoUrl('');
    setVideoPreviewUrl('');
    setCoverFile(null);
    setCoverUrl('');
    setCoverPreviewUrl('');
    setVideoFileName('');
    setDurationSec(120);
    setResolution('1920×1080');
    setFileSizeBytes(0);
    setFormError('');
    setPreviewOpen(true);
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
  }

  /**
   * 删除已上传的视频与封面：先从文件服务彻底删除远端文件，再清空对应状态。
   * 本地尚未上传的文件只释放预览、不调用删除。
   */
  async function handleDeleteUploaded() {
    if (!hasUploadedFiles() && !videoFile && !coverFile) {
      setFormError('当前没有可删除的视频或封面');
      return;
    }
    try {
      // 仅删除服务器上的远端文件；本地待上传文件无需调用删除接口
      await deleteFilesByUrls([videoUrl, coverUrl]);
      releaseLocalPreview(videoPreviewUrl);
      releaseLocalPreview(coverPreviewUrl);
      setVideoFile(null);
      setVideoUrl('');
      setVideoPreviewUrl('');
      setCoverFile(null);
      setCoverUrl('');
      setCoverPreviewUrl('');
      setVideoFileName('');
      setFileSizeBytes(0);
      setFormError('');
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '删除已上传文件失败');
    }
  }

  function handleSave() {
    if (!title.trim()) {
      setFormError('请填写视频标题');
      return;
    }
    if (!description.trim()) {
      setFormError('请填写视频简介');
      return;
    }
    if (!videoFile && !videoUrl) {
      setFormError('请选择视频文件');
      return;
    }
    if (!coverFile && !coverUrl) {
      setFormError('请上传或选择视频封面');
      return;
    }
    // 新建分类后本页的 categoryOptions（独立的 hook 实例）可能尚未刷新，
    // resolvePublishCategoryCode 查不到会返回空；此时 category state 已是新分类 code，
    // 直接沿用，避免误判为「未选择分类」。
    const resolved = resolvePublishCategoryCode(categoryOptions, category);
    const finalCategory = resolved || category.trim();
    if (!finalCategory) {
      setFormError(categoryError || '请选择所属分类');
      return;
    }
    setFormError('');

    // 需要上传的文件（未选择新文件则沿用原地址）
    const uploads: Array<{
      file: File;
      name?: string;
      kind?: string;
      bizType?: 'USER' | 'MATERIAL';
    }> = [];
    if (videoFile) uploads.push({ file: videoFile, kind: '视频文件' });
    if (coverFile) uploads.push({ file: coverFile, kind: '封面图片' });

    // 所有文件上传完成后的保存逻辑（构造 payload、写库、刷新）
    const finish = async (uploadedUrls: string[]) => {
      let cursor = 0;
      const finalVideoUrl = videoFile ? uploadedUrls[cursor++] : videoUrl;
      const finalCoverUrl = coverFile ? uploadedUrls[cursor++] : coverUrl;
      const finalSize = videoFile ? uploads[0].file.size : fileSizeBytes;

      const payload: Partial<VideoItem> = {
        title: title.trim(),
        description: description.trim(),
        category: finalCategory,
        status,
        videoUrl: finalVideoUrl,
        coverUrl: finalCoverUrl,
        durationSec,
        resolution,
        fileSizeBytes: finalSize,
      };
      if (item) {
        await api.updateVideo(item.id, payload);
        void deleteFilesByUrls(
          removedUrls([item.videoUrl, item.coverUrl], [finalVideoUrl, finalCoverUrl])
        );
      } else {
        await api.createVideo(payload);
      }
      await onSaved();
    };

    if (uploads.length === 0) {
      // 未选择新文件，仅元数据变更：直接保存后返回
      setSaving(true);
      void finish([])
        .then(() => onBack())
        .catch((err) => {
          setFormError(err instanceof Error ? err.message : '保存失败');
          setSaving(false);
        });
      return;
    }

    // 入队后台上传：全部成功后保存记录；用户可立即返回列表继续新增其它视频
    uploadTaskQueue.enqueueBatch(uploads, finish);
    onBack();
  }

  return (
    <EditorWorkspace
      title={item ? '编辑视频信息' : '上传新视频'}
      onBack={onBack}
      previewOpen={previewOpen}
      onPreviewOpenChange={setPreviewOpen}
      actions={
        <>
          <button
            type="button"
            onClick={handleClearForm}
            className="h-10 px-4 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[13px] font-medium text-[#1D1D1F] inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            清空表单
          </button>
          <button
            type="button"
            onClick={onBack}
            className="h-10 px-4 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[13px] font-medium text-[#1D1D1F]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-10 px-5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium"
          >
            {uploadsPending() ? '加入上传队列' : item ? '保存更改' : '确认发布'}
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
            {videoFile
              ? '已选择本地视频，点击「加入上传队列」后在后台上传'
              : videoUrl
                ? '已选择视频文件，点击或拖拽可替换'
                : '点击选择或拖拽视频文件至此'}
          </div>
          <div className="text-[12px] text-[#86868B] mt-1">
            支持 MP4、MOV、WebM · 大文件自动分片上传，期间可继续新增其它视频 <span className="text-[#D70015]">*</span>
          </div>

          {(videoFile || videoUrl) && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#16A34A]">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {videoFile ? '待上传' : '媒体文件已就绪'}
                {videoFileName ? ` · ${videoFileName}` : ''}
                {videoFile ? ` · ${formatFileSize(fileSizeBytes)}` : ''} ·{' '}
                {formatDuration(durationSec)} · {resolution}
              </span>
            </div>
          )}

          {(hasUploadedFiles() || videoFile || coverFile) && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => void handleDeleteUploaded()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FF3B30]/25 bg-[#FF3B30]/5 text-[12px] font-medium text-[#D70015] hover:bg-[#FF3B30]/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                删除已上传视频与封面
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-2xl bg-[#F5F5F7]">
          <div className="w-36 aspect-video rounded-xl overflow-hidden bg-[#E5E5EA] shrink-0">
            <MediaImage
              src={coverPreviewUrl}
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
              选择视频后会自动截取首帧作为封面，也可手动选择海报图，保存时才上传。
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
              disabled={coverProcessing}
              onClick={() => coverInputRef.current?.click()}
              className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5EA] text-[12px] font-medium text-[#1D1D1F] hover:bg-[#FAFAFA] disabled:opacity-60"
            >
              {coverProcessing ? '正在处理封面...' : '更换封面图片'}
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
          <CategorySelect
            module="VIDEO"
            value={category}
            onChange={setCategory}
            label="所属分类"
            required
            ariaLabel="所属分类"
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
          coverUrl={coverPreviewUrl}
          videoUrl={videoPreviewUrl}
          durationSec={durationSec}
          resolution={resolution}
          videoRef={previewVideoRef}
          onCaptureCover={captureCoverFromPreview}
          capturingCover={capturingCover}
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
export function VideoViewPage({ item, onBack }: VideoViewPageProps) {
  const playableVideoUrl = toPlayableVideoUrl(item.videoUrl);
  return (
    <PageShell
      title={item.title}
      subtitle={`${item.category} · ${item.resolution} · ${formatDuration(item.durationSec)}`}
      onBack={onBack}
      maxWidth="max-w-[900px]"
    >
      <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center">
        {playableVideoUrl ? (
          // 使用统一播放器，控件一致；16:9 容器避免不同分辨率导致布局跳动
          <div className="relative w-full aspect-video">
            <video
              src={playableVideoUrl}
              poster={item.coverUrl || undefined}
              controls
              playsInline
              className="absolute inset-0 w-full h-full bg-black object-contain"
            />
          </div>
        ) : (
          // 无视频源时用封面占位，保持 16:9 容器以承载提示层
          <div className="relative w-full aspect-video">
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
          </div>
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
