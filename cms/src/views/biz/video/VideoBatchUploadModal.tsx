import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, UploadCloud, X } from 'lucide-react';
import { api, convertToWebp } from '../../../lib/api.ts';
import { showToast } from '../../../components/AppToast.tsx';
import { CategorySelect } from '../../../components/CategorySelect.tsx';
import { usePublishCategories } from '../../../lib/usePublishCategories.ts';
import { MAX_VIDEO_SIZE } from '../../../lib/videoConstants.ts';
import {
  extractVideoMetadataAndFrame,
  titleFromFileName,
} from '../../../lib/videoDrop.ts';
import { uploadTaskQueue } from '../../../lib/uploadTaskQueue.ts';
import type { ContentStatus, VideoItem } from '../../../types/cms.ts';

interface BatchRow {
  id: string;
  file: File;
  title: string;
  description: string;
  category: string;
  durationSec: number;
  resolution: string;
  fileSizeBytes: number;
  coverFile: File | null;
  coverUrl: string;
  videoUrl: string;
  status: 'ready' | 'uploading' | 'success' | 'error';
  error: string;
}

interface VideoBatchUploadModalProps {
  files: File[];
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
}

/** 多视频/文件夹拖拽后的批量上传表格 */
export function VideoBatchUploadModal({
  files,
  onClose,
  onUploaded,
}: VideoBatchUploadModalProps) {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [topCategory, setTopCategory] = useState('');
  const [topDescription, setTopDescription] = useState('');
  const [status, setStatus] = useState<ContentStatus>('published');
  const [preparing, setPreparing] = useState(true);
  const [formError, setFormError] = useState('');
  const { options: categoryOptions } = usePublishCategories('VIDEO');
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    },
    []
  );

  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    setPreparing(true);

    void (async () => {
      const prepared: BatchRow[] = [];
      for (const file of files) {
        if (file.size > MAX_VIDEO_SIZE) {
          prepared.push({
            id: `${file.name}-${file.size}-${prepared.length}`,
            file,
            title: titleFromFileName(file.name),
            description: '',
            category: '',
            durationSec: 60,
            resolution: '1920×1080',
            fileSizeBytes: file.size,
            coverFile: null,
            coverUrl: '',
            videoUrl: '',
            status: 'error',
            error: '视频超过 1 GB',
          });
          continue;
        }
        const videoUrl = URL.createObjectURL(file);
        urls.push(videoUrl);
        const row: BatchRow = {
          id: `${file.name}-${file.size}-${prepared.length}`,
          file,
          title: titleFromFileName(file.name),
          description: '',
          category: '',
          durationSec: 60,
          resolution: '1920×1080',
          fileSizeBytes: file.size,
          coverFile: null,
          coverUrl: '',
          videoUrl,
          status: 'ready',
          error: '',
        };
        prepared.push(row);
        try {
          const meta = await extractVideoMetadataAndFrame(file);
          row.durationSec = meta.duration || 60;
          row.resolution = meta.resolution;
          if (meta.coverBlob) {
            const frame = new File([meta.coverBlob], `${row.title || 'video'}-cover.jpg`, {
              type: 'image/jpeg',
            });
            row.coverFile = await convertToWebp(frame, 0.9);
            const coverUrl = URL.createObjectURL(row.coverFile);
            urls.push(coverUrl);
            row.coverUrl = coverUrl;
          } else {
            row.error = '自动截取封面失败，请手动上传';
          }
        } catch {
          row.error = '读取视频信息失败，可继续上传';
        }
      }
      if (!alive) {
        urls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      urls.forEach((url) => objectUrlsRef.current.add(url));
      setRows(prepared);
      setPreparing(false);
    })();

    return () => {
      alive = false;
    };
  }, [files]);

  const busy = useMemo(() => rows.some((row) => row.status === 'uploading'), [rows]);
  const finished = useMemo(
    () => rows.length > 0 && rows.every((row) => row.status === 'success'),
    [rows]
  );

  function patchRow(id: string, patch: Partial<BatchRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function applyTopSettings() {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        category: topCategory || row.category,
        description: topDescription || row.description,
      }))
    );
  }

  async function handleCoverChange(row: BatchRow, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const cover = await convertToWebp(file, 0.9);
      const oldUrl = row.coverUrl;
      if (oldUrl && objectUrlsRef.current.has(oldUrl)) {
        URL.revokeObjectURL(oldUrl);
        objectUrlsRef.current.delete(oldUrl);
      }
      const url = URL.createObjectURL(cover);
      objectUrlsRef.current.add(url);
      patchRow(row.id, { coverFile: cover, coverUrl: url, error: '' });
    } catch {
      patchRow(row.id, { error: '封面处理失败' });
    }
  }

  function uploadRow(row: BatchRow) {
    setFormError('');
    if (row.status === 'uploading' || row.status === 'success') return;
    const category = (row.category || topCategory).trim();
    if (!category) {
      setFormError(`请为「${row.title || row.file.name}」选择分类，或在顶部统一设置分类`);
      return;
    }
    if (!row.coverFile) {
      patchRow(row.id, { status: 'error', error: '请先上传封面' });
      return;
    }
    const title = row.title.trim();
    if (!title) {
      patchRow(row.id, { status: 'error', error: '请填写视频标题' });
      return;
    }

    patchRow(row.id, { status: 'uploading', error: '' });
    const coverFile = row.coverFile;
    uploadTaskQueue.enqueueBatch(
      [
        { file: row.file, kind: '视频文件' },
        { file: coverFile, kind: '封面图片' },
      ],
      async (urls) => {
        const payload: Partial<VideoItem> = {
          title,
          description: row.description.trim() || topDescription.trim() || title,
          category,
          status,
          videoUrl: urls[0],
          coverUrl: urls[1],
          durationSec: row.durationSec,
          resolution: row.resolution,
          fileSizeBytes: row.fileSizeBytes,
        };
        try {
          await api.createVideo(payload);
          patchRow(row.id, { status: 'success' });
          await onUploaded();
        } catch (error) {
          patchRow(row.id, {
            status: 'error',
            error: error instanceof Error ? error.message : '保存视频失败',
          });
        }
      }
    );
    showToast(`「${title}」已加入上传队列`, 'info');
  }

  function uploadAll() {
    setFormError('');
    const pending = rows.filter((row) => row.status === 'ready' || row.status === 'error');
    if (!pending.length) return;
    if (!topCategory && pending.some((row) => !row.category.trim())) {
      setFormError('请在顶部统一设置分类，或逐个选择分类');
      return;
    }
    pending.forEach(uploadRow);
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="批量上传视频"
        className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-[20px] bg-white shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#E5E5EA] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-[#1D1D1F]">
              批量上传视频（{rows.length}）
            </h2>
            <p className="mt-0.5 text-[12px] text-[#86868B]">
              已自动生成标题与封面，文件加入后台队列上传，可继续操作页面
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="关闭"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-[#F2F2F7] shrink-0 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-[#3A3A3C] mb-1">统一分类</div>
              <CategorySelect
                module="VIDEO"
                value={topCategory}
                onChange={setTopCategory}
                options={categoryOptions}
                placeholder="选择后应用到全部视频"
                className="w-full"
              />
            </div>
            <div className="min-w-0 lg:col-span-2">
              <div className="text-[12px] font-medium text-[#3A3A3C] mb-1">统一描述</div>
              <input
                value={topDescription}
                onChange={(event) => setTopDescription(event.target.value)}
                placeholder="留空时每行使用各自描述或标题"
                className="w-full h-9 px-3 rounded-xl border border-[#E5E5EA] text-[13px] outline-none focus:border-[#0071E3]"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 text-[12px] text-[#3A3A3C]">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={status === 'published'}
                  onChange={() => setStatus('published')}
                />
                发布
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                />
                草稿
              </label>
            </div>
            <button
              type="button"
              onClick={applyTopSettings}
              className="h-8 px-3 rounded-lg border border-[#D2D2D7] text-[12px] hover:bg-[#F5F5F7]"
            >
              应用到全部
            </button>
          </div>
        </div>

        {formError && (
          <div className="mx-6 mt-3 rounded-xl bg-[#FFF1F0] border border-[#FFCCC7] px-3.5 py-2 text-[12px] text-[#D70015] shrink-0">
            {formError}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
          {preparing ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#86868B]">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在读取 {files.length} 个视频并生成封面…
            </div>
          ) : (
            <table className="w-full min-w-[1080px] border-collapse text-[12px]">
              <thead className="sticky top-0 bg-[#F9F9FB] z-10">
                <tr className="text-left text-[#86868B]">
                  <th className="px-2 py-2 font-medium w-[190px]">视频</th>
                  <th className="px-2 py-2 font-medium w-[120px]">封面</th>
                  <th className="px-2 py-2 font-medium">视频标题</th>
                  <th className="px-2 py-2 font-medium">描述信息</th>
                  <th className="px-2 py-2 font-medium w-[180px]">分类</th>
                  <th className="px-2 py-2 font-medium w-[90px]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F7]">
                {rows.map((row) => (
                  <tr key={row.id} className="align-middle">
                    <td className="px-2 py-2 align-middle">
                      <div className="relative w-[170px] h-[96px] rounded-lg overflow-hidden bg-black/5">
                        <video
                          src={row.videoUrl}
                          muted
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] leading-none text-white">
                          {row.resolution} · {row.durationSec}s
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-[#86868B] truncate" title={row.file.name}>
                        {row.file.name}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-middle">
                      {row.coverUrl ? (
                        <img
                          src={row.coverUrl}
                          alt="封面预览"
                          className="w-[110px] h-[72px] object-cover rounded-lg border border-[#E5E5EA]"
                        />
                      ) : (
                        <div className="w-[110px] h-[72px] rounded-lg border border-dashed border-[#C7C7CC] flex items-center justify-center text-[11px] text-[#86868B]">
                          无封面
                        </div>
                      )}
                      <label className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#0071E3] cursor-pointer">
                        更换封面
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => void handleCoverChange(row, event)}
                        />
                      </label>
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <input
                        value={row.title}
                        onChange={(event) => patchRow(row.id, { title: event.target.value })}
                        className="w-full h-9 px-2 rounded-lg border border-[#E5E5EA] text-[12px] outline-none focus:border-[#0071E3]"
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <textarea
                        value={row.description}
                        onChange={(event) => patchRow(row.id, { description: event.target.value })}
                        rows={3}
                        placeholder={topDescription || '可留空，使用统一描述'}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#E5E5EA] text-[12px] outline-none focus:border-[#0071E3] resize-none"
                      />
                      {row.error && (
                        <div className="mt-1 flex items-start gap-1 text-[11px] text-[#D70015]">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          {row.error}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <CategorySelect
                        module="VIDEO"
                        value={row.category}
                        onChange={(value) => patchRow(row.id, { category: value })}
                        options={categoryOptions}
                        allowQuickCreate={false}
                        ariaLabel={`分类-${row.file.name}`}
                        className="w-full"
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <button
                        type="button"
                        disabled={row.status === 'uploading' || row.status === 'success' || preparing}
                        onClick={() => uploadRow(row)}
                        className="h-8 px-3 rounded-lg bg-[#0071E3] text-white text-[12px] font-medium inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        {row.status === 'uploading' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : row.status === 'success' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <UploadCloud className="w-3 h-3" />
                        )}
                        {row.status === 'success' ? '已加入' : row.status === 'uploading' ? '上传中' : '上传'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#F2F2F7] flex items-center justify-between gap-3 shrink-0 bg-[#FAFAFC]">
          <div className="text-[12px] text-[#86868B]">
            {finished ? '全部视频已加入上传队列' : `共 ${rows.length} 个视频，文件将分批上传`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-9 px-4 rounded-xl border border-[#D2D2D7] text-[13px] disabled:opacity-50"
            >
              关闭
            </button>
            <button
              type="button"
              onClick={uploadAll}
              disabled={preparing || busy || finished}
              className="h-9 px-4 rounded-xl bg-[#0071E3] text-white text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              全部上传
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
