import { useMemo, useRef, useState, type DragEvent } from 'react';
import {
  CheckCircle2,
  Edit3,
  Film,
  LayoutGrid,
  List,
  Play,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { api, uploadFileWithProgress } from '../lib/api.ts';
import {
  formatDateShort,
  formatDuration,
  formatFileSize,
  formatNumber,
} from '../lib/format.ts';
import type { ContentStatus, VideoItem } from '../types/cms.ts';
import { MediaImage } from './MediaImage.tsx';

interface VideoManagerViewProps {
  videos: VideoItem[];
  onRefresh: () => Promise<void>;
  externalUploadTrigger?: number;
}

const VIDEO_CATEGORIES = ['设计纪录', '建筑空间', '产品美学', '工作流指南', '幕后访谈'];

export function VideoManagerView({
  videos,
  onRefresh,
  externalUploadTrigger,
}: VideoManagerViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Upload / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VideoItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('设计纪录');
  const [status, setStatus] = useState<ContentStatus>('published');
  const [videoUrl, setVideoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [durationSec, setDurationSec] = useState(120);
  const [resolution, setResolution] = useState('1920×1080');
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [formError, setFormError] = useState('');

  // Preview & Delete confirmation state
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VideoItem | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const lastTriggerRef = useRef(externalUploadTrigger || 0);

  if (externalUploadTrigger && externalUploadTrigger !== lastTriggerRef.current) {
    lastTriggerRef.current = externalUploadTrigger;
    queueMicrotask(() => openCreateModal());
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
      );
    });
  }, [videos, search, statusFilter]);

  function openCreateModal() {
    setEditingItem(null);
    setTitle('');
    setDescription('');
    setCategory('设计纪录');
    setStatus('published');
    setVideoUrl('');
    setCoverUrl('');
    setDurationSec(120);
    setResolution('1920×1080');
    setFileSizeBytes(0);
    setUploadProgress(null);
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(item: VideoItem) {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description);
    setCategory(item.category);
    setStatus(item.status);
    setVideoUrl(item.videoUrl);
    setCoverUrl(item.coverUrl);
    setDurationSec(item.durationSec);
    setResolution(item.resolution);
    setFileSizeBytes(item.fileSizeBytes);
    setUploadProgress(null);
    setFormError('');
    setModalOpen(true);
  }

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

      const meta = await metaPromise;
      setDurationSec(meta.duration || 60);
      setResolution(meta.resolution);

      if (!coverUrl && meta.coverBlob) {
        const thumbFile = new File([meta.coverBlob], 'auto-cover.jpg', { type: 'image/jpeg' });
        const uploadedCover = await uploadFileWithProgress(thumbFile);
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
      const uploaded = await uploadFileWithProgress(file);
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
    if (file) {
      void handleVideoFile(file);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setFormError('请填写视频标题');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: Partial<VideoItem> = {
        title: title.trim(),
        description: description.trim(),
        category,
        status,
        videoUrl,
        coverUrl: coverUrl || '/src/assets/images/video_cover_studio_1795026084973.jpg',
        durationSec,
        resolution,
        fileSizeBytes,
      };
      if (editingItem) {
        await api.updateVideo(editingItem.id, payload);
      } else {
        await api.createVideo(payload);
      }
      await onRefresh();
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(item: VideoItem) {
    const nextStatus: ContentStatus = item.status === 'published' ? 'draft' : 'published';
    await api.updateVideo(item.id, { status: nextStatus });
    await onRefresh();
  }

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return;
    await api.deleteVideo(confirmDelete.id);
    setConfirmDelete(null);
    await onRefresh();
  }

  function openPlayer(item: VideoItem) {
    setPlayingVideo(item);
    void api.trackView('video', item.id).then(() => onRefresh());
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
              placeholder="搜索视频标题或分类..."
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

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="网格视图"
              className={`p-1.5 rounded-[8px] transition-colors ${
                viewMode === 'grid' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="列表视图"
              className={`p-1.5 rounded-[8px] transition-colors ${
                viewMode === 'list' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>上传视频</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-16 px-6 text-center">
          <Film className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">暂无匹配的视频内容</h3>
          <p className="text-[13px] text-[#6E6E73] mt-1">
            拖拽 MP4、MOV 或 WebM 文件即可快速上传并自动生成视频封面
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            <span>立即上传首个视频</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col"
            >
              <div
                onClick={() => openPlayer(item)}
                className="relative aspect-video bg-[#F2F2F7] overflow-hidden cursor-pointer group"
              >
                <MediaImage
                  src={item.coverUrl}
                  alt={item.title}
                  fallbackLabel={item.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#1D1D1F] shadow-md group-hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-[12px] text-white/95 font-mono tabular-nums">
                  <span>{item.resolution}</span>
                  <span>{formatDuration(item.durationSec)}</span>
                </div>
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
                    onClick={() => openPlayer(item)}
                    className="text-[16px] font-semibold text-[#1D1D1F] leading-snug line-clamp-1 cursor-pointer hover:text-[#0071E3] transition-colors"
                  >
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] text-[#6E6E73] line-clamp-2 leading-relaxed">
                    {item.description || '暂无视频简介说明'}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-[#F2F2F7] flex items-center justify-between gap-2">
                  <div className="text-[12px] text-[#86868B] tabular-nums">
                    {formatNumber(item.views)} 次播放 · {formatFileSize(item.fileSizeBytes)}
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
      ) : (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5EA] text-[12px] font-medium text-[#86868B]">
                  <th className="py-3 px-5">视频内容</th>
                  <th className="py-3 px-4">分类</th>
                  <th className="py-3 px-4">时长 / 画质</th>
                  <th className="py-3 px-4 text-right">播放量</th>
                  <th className="py-3 px-4">状态</th>
                  <th className="py-3 px-5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F7] text-[13px]">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F5F5F7]/60 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <button
                          type="button"
                          onClick={() => openPlayer(item)}
                          className="relative w-20 h-11 rounded-lg overflow-hidden shrink-0 bg-[#F2F2F7] group"
                        >
                          <MediaImage
                            src={item.coverUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openPlayer(item)}
                            className="font-medium text-[#1D1D1F] hover:text-[#0071E3] text-left truncate block max-w-[280px]"
                          >
                            {item.title}
                          </button>
                          <div className="text-[12px] text-[#86868B] tabular-nums">
                            {formatDateShort(item.updatedAt)} · {item.authorName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#6E6E73] whitespace-nowrap">{item.category}</td>
                    <td className="py-3 px-4 text-[#6E6E73] font-mono tabular-nums whitespace-nowrap">
                      {formatDuration(item.durationSec)} · {item.resolution}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[#1D1D1F] tabular-nums">
                      {formatNumber(item.views)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          item.status === 'published' ? 'text-[#16A34A]' : 'text-[#D97706]'
                        }`}
                      >
                        {item.status === 'published' ? '已发布' : '草稿'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="px-2.5 py-1 rounded-lg text-[12px] text-[#0071E3] hover:bg-[#0071E3]/8 font-medium"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(item)}
                          className="px-2.5 py-1 rounded-lg text-[12px] text-[#D70015] hover:bg-[#FF3B30]/8 font-medium"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload / Edit Video Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto bg-white rounded-[22px] border border-[#E5E5EA] shadow-[0_24px_60px_rgba(0,0,0,0.16)] p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[19px] font-semibold text-[#1D1D1F]">
                  {editingItem ? '编辑视频信息' : '上传新视频'}
                </h2>
                <p className="text-[13px] text-[#6E6E73] mt-0.5">
                  支持拖拽视频直传，系统自动读取时长、分辨率并截取视频封面
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
              {/* Drag & Drop Video Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => videoInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
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
                  支持 MP4、MOV、WebM · 最大 200 MB
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

              {/* Cover Preview + Custom Upload */}
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
                  <div className="text-[13px] font-medium text-[#1D1D1F]">视频封面图</div>
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
                  视频标题
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
                    所属分类
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] text-[14px] text-[#1D1D1F] focus:bg-white focus:outline-none"
                  >
                    {VIDEO_CATEGORIES.map((c) => (
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
                  内容简介
                </label>
                <textarea
                  rows={3}
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
                disabled={saving}
                onClick={handleSave}
                className="h-10 px-5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-60 text-white text-[13px] font-medium"
              >
                {saving ? '正在保存...' : editingItem ? '保存更改' : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Preview Modal */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-[820px] bg-white rounded-[22px] overflow-hidden shadow-2xl">
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {playingVideo.videoUrl ? (
                <video
                  src={playingVideo.videoUrl}
                  poster={playingVideo.coverUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <>
                  <MediaImage
                    src={playingVideo.coverUrl}
                    alt={playingVideo.title}
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col items-center justify-center text-white px-6 text-center">
                    <div className="px-4 py-2 rounded-xl bg-black/50 backdrop-blur-md text-[13px]">
                      示例演示条目 · 可点击「上传视频」传入本地 MP4/MOV 实现原生播放
                    </div>
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => setPlayingVideo(null)}
                aria-label="关闭播放器"
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#6E6E73] mb-1.5 tabular-nums">
                <span>
                  {playingVideo.category} · {playingVideo.resolution} · {formatDuration(playingVideo.durationSec)}
                </span>
                <span>{formatNumber(playingVideo.views)} 次播放</span>
              </div>
              <h3 className="text-[19px] font-semibold text-[#1D1D1F]">{playingVideo.title}</h3>
              <p className="mt-2 text-[14px] text-[#6E6E73] leading-relaxed">
                {playingVideo.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-[380px] bg-white rounded-[20px] border border-[#E5E5EA] p-6 shadow-xl">
            <h3 className="text-[17px] font-semibold text-[#1D1D1F]">确认删除该视频？</h3>
            <p className="mt-2 text-[13px] text-[#6E6E73] leading-relaxed">
              即将永久移除「{confirmDelete.title}」，此操作无法撤销。
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
