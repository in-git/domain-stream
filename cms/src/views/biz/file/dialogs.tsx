/**
 * 文件中心弹窗集合：预览播放、详情、删除确认
 * 供 biz/file/index 使用，UI 风格与私域工作台保持一致。
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { CategoryModal, PrimaryButton, SecondaryButton } from '../category/dialogs.tsx';
import {
  fetchFileBlob,
  isAudioFile,
  isImageFile,
  isVideoFile,
  toOpenUrl,
  toStreamUrl,
  type DevFile,
} from '../../../lib/fileCenter.ts';
import { formatDateShort } from '../../../lib/format.ts';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败，请稍后重试';
}

/**
 * 素材预览弹窗：视频/音频走流式播放（公开文件带签名可直接 Range 拖动），
 * 授权文件先经 authDownload 拉取 blob 再本地播放；图片直接展示。
 */
export function FilePreviewDialog({ file, onClose }: { file: DevFile; onClose: () => void }) {
  const [objectUrl, setObjectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isVideo = isVideoFile(file);
  const isAudio = isAudioFile(file);
  const isImage = isImageFile(file);
  // 公开文件优先用流式/直连地址，无需下载整个文件
  const directUrl = isImage ? toOpenUrl(file) : toStreamUrl(file);

  useEffect(() => {
    // 无公开地址时，视频/音频/图片都走 authDownload 拉 blob 本地播放或预览
    if (directUrl || (!isVideo && !isAudio && !isImage)) return;
    let revoked = '';
    let alive = true;
    setLoading(true);
    setError('');
    fetchFileBlob(file)
      .then((blob) => {
        if (!alive) return;
        revoked = URL.createObjectURL(blob);
        setObjectUrl(revoked);
      })
      .catch((err) => {
        if (alive) setError(errorMessage(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [file, directUrl, isVideo, isAudio, isImage]);

  return (
    <CategoryModal
      title={file.name || '素材预览'}
      subtitle={`${file.sizeInfo || ''}${file.suffix ? ` · ${(file.suffix || '').toUpperCase()}` : ''}`}
      onClose={onClose}
      width="max-w-3xl"
    >
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-[#86868B]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
          <span className="text-[13px]">正在加载素材...</span>
        </div>
      ) : error ? (
        <div className="py-12 text-center text-[13px] text-[#D70015]">{error}</div>
      ) : isVideo && (directUrl || objectUrl) ? (
        <div className="rounded-xl overflow-hidden bg-black">
          <video
            src={directUrl || objectUrl}
            poster={file.thumbnail}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="w-full max-h-[65vh] bg-black"
          />
        </div>
      ) : isAudio && (directUrl || objectUrl) ? (
        <div className="py-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0071E3]/8 flex items-center justify-center text-[#0071E3] text-2xl">
            ♪
          </div>
          <audio src={directUrl || objectUrl} controls autoPlay className="w-full max-w-md" />
        </div>
      ) : isImage && (directUrl || objectUrl) ? (
        <div className="flex justify-center rounded-xl bg-[#F5F5F7] p-3">
          <img
            src={directUrl || objectUrl}
            alt={file.name || '图片'}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[65vh] object-contain rounded-lg"
          />
        </div>
      ) : (
        <div className="py-12 text-center text-[13px] text-[#86868B]">
          该格式暂不支持在线预览，可通过下载查看
        </div>
      )}
    </CategoryModal>
  );
}

/** 素材详情弹窗 */
export function FileDetailDialog({ file, onClose }: { file: DevFile; onClose: () => void }) {
  const rows: Array<[string, ReactNode]> = [
    ['文件名称', file.name || '-'],
    ['素材分类', file.category || '-'],
    ['文件后缀', file.suffix ? file.suffix.toUpperCase() : '-'],
    ['文件大小', file.sizeInfo || '-'],
    ['存储引擎', file.engine || '-'],
    ['存储桶', file.bucket || '-'],
    ['文件 Key', file.fileKey || '-'],
    ['下载是否需授权', file.isDownloadAuth ? '是' : '否'],
    ['上传时间', file.createTime ? formatDateShort(file.createTime) : '-'],
    ['更新时间', file.updateTime ? formatDateShort(file.updateTime) : '-'],
    ['文件 ID', <span key="id" className="font-mono text-[12px]">{file.id}</span>],
  ];
  return (
    <CategoryModal title="素材详情" onClose={onClose} width="max-w-lg">
      <dl className="divide-y divide-[#F2F2F7]">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[110px_1fr] gap-3 py-2.5 text-[13px]">
            <dt className="text-[#86868B]">{label}</dt>
            <dd className="text-[#1D1D1F] break-all min-w-0">{value}</dd>
          </div>
        ))}
      </dl>
    </CategoryModal>
  );
}

/** 失效图片检测确认弹窗：列出物理文件已不存在的图片，由调用方执行清理 */
export function FileInvalidDialog({
  files,
  busy,
  onClose,
  onConfirm,
}: {
  files: DevFile[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <CategoryModal title="检测到失效图片" onClose={onClose} width="max-w-lg">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#FF9F0A]/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4.5 h-4.5 text-[#B96B00]" strokeWidth={1.8} />
        </div>
        <div className="text-[13px] text-[#3A3A3C] leading-relaxed">
          检测到 {files.length} 个图片记录的物理文件已不存在。清理只会删除这些失效记录，不会调用存储删除；执行前会再次校验，期间被恢复的文件不会被删除。
        </div>
      </div>
      <div className="rounded-xl bg-[#F5F5F7] px-4 py-3 max-h-56 overflow-y-auto">
        {files.map((file) => (
          <div key={file.id} className="py-0.5">
            <div className="text-[13px] text-[#1D1D1F] truncate">{file.name || file.id}</div>
            <div className="text-[11px] text-[#86868B] truncate">{file.fileKey || file.id}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <SecondaryButton onClick={onClose} disabled={busy}>取消</SecondaryButton>
        <PrimaryButton danger busy={busy} onClick={onConfirm}>
          一键清理
        </PrimaryButton>
      </div>
    </CategoryModal>
  );
}

/** 删除确认弹窗（支持批量），confirm 由调用方执行删除请求 */
export function FileDeleteDialog({
  files,
  busy,
  onClose,
  onConfirm,
}: {
  files: DevFile[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <CategoryModal title="确认删除素材" onClose={onClose} width="max-w-md">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4.5 h-4.5 text-[#D70015]" strokeWidth={1.8} />
        </div>
        <div className="text-[13px] text-[#3A3A3C] leading-relaxed">
          此操作将从素材库中移除 {files.length > 1 ? `${files.length} 个` : '该'}素材，且不可撤销。
          {files.some((f) => f.isDownloadAuth) && (
            <span className="block mt-1 text-[12px] text-[#86868B]">
              注意：删除的是文件记录，存储对象如需彻底清理请使用后台物理删除。
            </span>
          )}
        </div>
      </div>
      <div className="rounded-xl bg-[#F5F5F7] px-4 py-3 max-h-40 overflow-y-auto">
        {files.map((f) => (
          <div key={f.id} className="text-[13px] text-[#1D1D1F] truncate py-0.5">
            {f.name || f.id}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <SecondaryButton onClick={onClose}>取消</SecondaryButton>
        <PrimaryButton danger busy={busy} onClick={onConfirm}>
          删除
        </PrimaryButton>
      </div>
    </CategoryModal>
  );
}
