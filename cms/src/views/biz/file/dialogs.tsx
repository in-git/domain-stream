/**
 * 文件中心弹窗集合：预览播放、详情、删除确认
 * 供 biz/file/index 使用，UI 风格与私域工作台保持一致。
 */
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { CategoryModal, PrimaryButton, SecondaryButton } from '../category/dialogs.tsx';
import type { DevFile } from '../../../lib/fileCenter.ts';
import { FileMedia } from '../../../components/FileMedia.tsx';
import { formatDateShort } from '../../../lib/format.ts';

/**
 * 素材预览弹窗：图片 / SVG / 视频 / 音频统一交给 FileMedia 渲染。
 */
export function FilePreviewDialog({ file, onClose }: { file: DevFile; onClose: () => void }) {
  return (
    <CategoryModal
      title={file.name || '素材预览'}
      subtitle={`${file.sizeInfo || ''}${file.suffix ? ` · ${(file.suffix || '').toUpperCase()}` : ''}`}
      onClose={onClose}
      width="max-w-3xl"
    >
      <FileMedia file={file} variant="player" />
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
