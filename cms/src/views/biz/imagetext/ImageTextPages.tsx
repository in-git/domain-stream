import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '../../../lib/api.ts';
import { deleteFilesByUrls, removedUrls } from '../../../lib/fileCenter.ts';
import {
  createPendingFile,
  createPendingFileFromDataUri,
  releasePendingFile,
  releasePendingFiles,
  uploadPendingFiles,
  type PendingFile,
} from '../../../lib/pendingUpload.ts';
import { formatDateShort, formatNumber } from '../../../lib/format.ts';
import {
  filterPublishCategories,
  publishCategoryName,
  resolvePublishCategoryCode,
} from '../../../lib/category.ts';
import { usePublishCategories } from '../../../lib/usePublishCategories.ts';
import type { ContentStatus, ImageTextItem } from '../../../types/cms.ts';
import { CategorySelect } from '../../../components/CategorySelect.tsx';
import { CoverCropper } from '../../../components/CoverCropper.tsx';
import { TextToImagePanel } from './TextToImagePanel.tsx';
import { ImageTextPreview } from './ImageTextPreview.tsx';
import { MediaImage } from '../../../components/MediaImage.tsx';
import { PageShell } from '../../../components/PageShell.tsx';
import {
  EditorWorkspace,
  type PreviewDevice,
} from '../../../components/EditorWorkspace.tsx';

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

interface SortableImageCardProps {
  entry: ImageEntry;
  index: number;
  total: number;
  onMove: (delta: number) => void;
  onRemove: () => void;
  /** 设为封面：把当前图片移到首位 */
  onMakeCover?: () => void;
}

/**
 * 单张图片卡片（dnd-kit 可排序项）
 * 拖拽时由框架接管 transform，其余卡片通过 transition 平滑让位。
 */
function SortableImageCard({
  entry,
  index,
  total,
  onMove,
  onRemove,
  onMakeCover,
}: SortableImageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.key,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'none',
        zIndex: isDragging ? 20 : undefined,
      }}
      {...attributes}
      {...listeners}
      className={`relative group aspect-[9/16] rounded-xl overflow-hidden border border-[#E5E5EA] bg-[#F2F2F7] cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/50 ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <MediaImage
        src={entry.previewUrl}
        alt={`图片 ${index + 1}`}
        className="w-full h-full object-cover pointer-events-none select-none"
      />
      {index === 0 ? (
        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#0071E3] text-white text-[10px] font-medium">
          封面
        </div>
      ) : (
        onMakeCover && (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onMakeCover}
            title="设为封面"
            className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#0071E3]"
          >
            设为封面
          </button>
        )
      )}
      {entry.pending && (
        <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-medium">
          待上传
        </div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="左移"
            className="w-6 h-6 rounded-md bg-white/90 text-[#1D1D1F] disabled:opacity-40 flex items-center justify-center"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="右移"
            className="w-6 h-6 rounded-md bg-white/90 text-[#1D1D1F] disabled:opacity-40 flex items-center justify-center"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="移除图片"
          className="w-6 h-6 rounded-md bg-[#FF3B30] text-white flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface PendingImagesBoardProps {
  images: ImageEntry[];
  sensors: ReturnType<typeof useSensors>;
  activeImage: ImageEntry | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragCancel: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onMove: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  /** 设为封面：把该图移到首位 */
  onMakeCover: (index: number) => void;
}

/**
 * 待上传图片看板
 * ------------------------------------------------------------------
 * 顶部横向预览区：已选 / 已上传的图片在此集中管理，
 * 支持拖拽排序、删除、一键设为封面；下方挂载上传方式（上传 / 文本转图文）。
 */
function PendingImagesBoard({
  images,
  sensors,
  activeImage,
  onDragStart,
  onDragCancel,
  onDragEnd,
  onMove,
  onRemove,
  onMakeCover,
}: PendingImagesBoardProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#1D1D1F]">图片</span>
          <span className="text-[11px] text-[#86868B]">
            已选 {images.length} 张
            {images.length > 0 && '（第 1 张为封面）'}
          </span>
        </div>
        {images.length > 1 && (
          <span className="text-[11px] text-[#86868B] shrink-0">拖拽图片可调整顺序</span>
        )}
      </div>

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D1D1D6] bg-[#FAFAFC] px-3 py-6 text-center text-[12px] text-[#86868B]">
          还没有图片，从下方「上传图片」或「文本转图文」添加
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragCancel={onDragCancel}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={images.map((entry) => entry.key)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
              {images.map((entry, idx) => (
                <SortableImageCard
                  key={entry.key}
                  entry={entry}
                  index={idx}
                  total={images.length}
                  onMove={(delta) => onMove(idx, delta)}
                  onRemove={() => onRemove(idx)}
                  onMakeCover={() => onMakeCover(idx)}
                />
              ))}
            </div>
          </SortableContext>

          {/* 拖拽中的浮层卡片：跟随指针并带落位回弹动画 */}
          <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeImage && (
              <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-[#0071E3] bg-[#F2F2F7] shadow-[0_16px_40px_rgba(0,0,0,0.24)] rotate-1 scale-[1.02]">
                <MediaImage
                  src={activeImage.previewUrl}
                  alt=""
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
                {activeImage.pending && (
                  <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-medium">
                    待上传
                  </div>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
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
  // 逐张裁剪队列：批量选择后依次弹出 9:16 裁剪弹窗
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropTotal, setCropTotal] = useState(0);
  const [saveProgress, setSaveProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // 正在拖拽的图片 key，用于 DragOverlay 跟随效果
  const [activeImageKey, setActiveImageKey] = useState<string | null>(null);
  const activeImage = activeImageKey
    ? images.find((entry) => entry.key === activeImageKey) ?? null
    : null;
  const imageSensors = useSensors(
    // 鼠标移动 5px 才启动拖拽，避免误触按钮点击
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // 触屏需长按 150ms，保留页面滚动
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  /** 图片添加方式：上传图片 / 文本转图文 */
  const [imageMode, setImageMode] = useState<'upload' | 'text'>('upload');

  /**
   * 把「文本转图文」生成的图片追加到图片列表（排在最前，方便设为封面）。
   * 后端返回的是 data URI，这里转成本地待上传文件：
   * 预览直接用 blob 地址，点保存时才上传，避免服务端堆积冗余文件。
   */
  function handleApplyGenerated(dataUris: string[]) {
    if (!dataUris.length) return;
    const stamp = Date.now();
    const entries: ImageEntry[] = [];
    dataUris.forEach((dataUri, index) => {
      const pending = createPendingFileFromDataUri(dataUri, `graphic-${stamp}-${index + 1}`);
      if (pending) {
        entries.push({ key: pending.key, url: '', pending, previewUrl: pending.previewUrl });
      }
    });
    if (!entries.length) {
      setFormError('图片解析失败，请重新生成');
      return;
    }
    setImages((prev) => [...entries, ...prev]);
    setFormError('');
  }

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

  /**
   * 分类下拉的可选项：与保存校验共用同一份数据。
   * 分类表单的「适用模块」是选填的，历史数据可能为空或标错，
   * 严格按模块过滤会让这些分类在下拉里消失（表现为「选不了」），
   * 因此这里复用 fetchPublishCategories 的宽松排序结果。
   */
  const categoryOptionsForSelect = useMemo(
    () => filterPublishCategories(categoryOptions, 'GRAPHIC'),
    [categoryOptions]
  );

  function handleImageFiles(fileList: FileList | File[]) {
    const validFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setFormError('请选择 JPG、PNG、WebP 等图片文件');
      return;
    }
    setFormError('');
    // 每张图片都要按 9:16 逐个裁剪，裁剪结果直接作为本地待上传文件
    setCropTotal(validFiles.length);
    setCropQueue(validFiles);
  }

  /** 单张裁剪完成：本地暂存后继续处理队列中的下一张 */
  function handleCropComplete(cropped: File) {
    const pending = createPendingFile(cropped);
    setImages((prev) => [
      ...prev,
      { key: pending.key, url: '', pending, previewUrl: pending.previewUrl },
    ]);
    setCropQueue((prev) => prev.slice(1));
  }

  /** 取消裁剪：结束剩余队列，已裁剪的图片保留 */
  function handleCropCancel() {
    setCropQueue([]);
    setCropTotal(0);
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

  /** 拖拽结束：按 dnd-kit 给出的目标位置重排图片（首张即封面） */
  function handleImageDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveImageKey(null);
    if (!over || active.id === over.id) return;
    setImages((prev) => {
      const from = prev.findIndex((entry) => entry.key === active.id);
      const to = prev.findIndex((entry) => entry.key === over.id);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
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
    <>
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
            disabled={saving}
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
      info={
        <div className="space-y-4">
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

          <CategorySelect
            module="GRAPHIC"
            value={category}
            onChange={setCategory}
            label="主题分类"
            required
            ariaLabel="主题分类"
            className="w-full"
            options={categoryOptionsForSelect}
          />

          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">图文配文</label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="写下这组影像背后的故事、质感描述或细节记录..."
              className="w-full p-3 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none text-[13px] resize-none leading-relaxed"
            />
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

          {formError && (
            <div className="rounded-xl bg-[#FF3B30]/8 px-3 py-2 text-[12px] text-[#D70015]">
              {formError}
            </div>
          )}
        </div>
      }
      editor={
        <div className="space-y-4">
        {/* 已选图片：置顶预览，可拖拽排序、设为封面、删除 */}
        <PendingImagesBoard
          images={images}
          sensors={imageSensors}
          activeImage={activeImage}
          onDragStart={(event) => setActiveImageKey(String(event.active.id))}
          onDragCancel={() => setActiveImageKey(null)}
          onDragEnd={handleImageDragEnd}
          onMove={moveImage}
          onRemove={removeImage}
          onMakeCover={(index) => moveImage(index, -index)}
        />

        {/* 图片添加方式切换：两种模式互斥，避免同屏两套入口 */}
        <div
          role="tablist"
          aria-label="图片添加方式"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]"
        >
          {(
            [
              { key: 'upload', label: '上传图片', icon: ImagePlus },
              { key: 'text', label: '文本转图文', icon: Sparkles },
            ] as const
          ).map((tab) => {
            const active = imageMode === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setImageMode(tab.key)}
                className={`h-9 px-3.5 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                  active
                    ? 'bg-white text-[#1D1D1F] shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {imageMode === 'upload' ? (
        <div
          onDragOver={(e) => {
            // 只响应文件拖入，忽略图片卡片之间的排序拖拽
            if (!e.dataTransfer.types.includes('Files')) return;
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
            仅支持图片（JPG / PNG / WebP），选图后按 9:16 逐张裁剪 · 保存时才上传
          </div>
        </div>
        ) : (
          <TextToImagePanel cardTitle={title} onApply={handleApplyGenerated} />
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
      {/* 批量选图后按 9:16 逐张裁剪，裁剪结果直接作为本地待上传文件 */}
      <CoverCropper
        file={cropQueue[0] ?? null}
        aspect={9 / 16}
        outputWidth={1080}
        heading={
          cropTotal > 1
            ? `裁剪第 ${cropTotal - cropQueue.length + 1} / ${cropTotal} 张（9:16）`
            : '裁剪图文图片（9:16）'
        }
        confirmText="使用此图片"
        onCancel={handleCropCancel}
        onComplete={handleCropComplete}
      />
    </>
  );
}

interface ImageViewPageProps {
  item: ImageTextItem;
  slide?: number;
  onRefresh: () => Promise<void>;
  onBack: () => void;
}

/** 图文相册独立页面（原灯箱弹窗） */
export function ImageViewPage({ item, slide = 0, onBack }: ImageViewPageProps) {
  const [activeSlide, setActiveSlide] = useState(
    Math.min(Math.max(slide, 0), Math.max(item.images.length - 1, 0))
  );

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
