/**
 * 素材中心弹窗：素材详情 + 引用代码复制
 * 预览播放 / 删除确认复用文件中心（同一套 DEV_FILE 接口与交互）。
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, Download, ExternalLink, Film, ImageOff, Music } from 'lucide-react';
import { CategoryModal, PrimaryButton, SecondaryButton } from '../category/dialogs.tsx';
import {
  fileResolution,
  isAudioFile,
  isImageFile,
  isVideoFile,
  toOpenUrl,
  type DevFile,
} from '../../../lib/fileCenter.ts';
import { formatDateTime } from '../../../lib/format.ts';
import { FileMedia } from '../../../components/FileMedia.tsx';

/** 把代理相对地址补全为可直接在浏览器打开的绝对地址 */
export function absoluteFileUrl(file: DevFile): string {
  const url = toOpenUrl(file);
  if (!url) return '';
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

/** 复制到剪贴板，兼容非安全上下文（http 访问）下 clipboard 不可用的场景 */
export async function copyText(text: string): Promise<void> {
  if (!text) throw new Error('没有可复制的内容');
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // 继续走兜底方案
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!ok) throw new Error('复制失败，请手动选择复制');
}

interface Snippet {
  key: string;
  label: string;
  value: string;
}

/** 生成该素材可复用的引用片段：直链 / Markdown / HTML */
export function assetSnippets(file: DevFile): Snippet[] {
  const url = absoluteFileUrl(file);
  if (!url) return [];
  const name = (file.name || '素材').replace(/[[\]]/g, '');
  const snippets: Snippet[] = [{ key: 'url', label: '文件直链', value: url }];
  if (isImageFile(file)) {
    snippets.push(
      { key: 'md', label: 'Markdown', value: `![${name}](${url})` },
      { key: 'html', label: 'HTML', value: `<img src="${url}" alt="${name}" />` }
    );
  } else if (isVideoFile(file)) {
    snippets.push({
      key: 'html',
      label: 'HTML 视频',
      value: `<video src="${url}" controls preload="metadata" style="max-width:100%"></video>`,
    });
  } else if (isAudioFile(file)) {
    snippets.push({
      key: 'html',
      label: 'HTML 音频',
      value: `<audio src="${url}" controls></audio>`,
    });
  }
  return snippets;
}

interface MaterialDetailDialogProps {
  file: DevFile;
  onClose: () => void;
  onPreview?: () => void;
  onDelete?: () => void;
}

/** 素材详情：左侧预览缩略，右侧元信息 + 一键复制引用代码 */
export function MaterialDetailDialog({
  file,
  onClose,
  onPreview,
  onDelete,
}: MaterialDetailDialogProps) {
  const [copiedKey, setCopiedKey] = useState('');
  const [copyError, setCopyError] = useState('');
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    if (!copiedKey) return;
    const timer = window.setTimeout(() => setCopiedKey(''), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedKey]);

  const snippets = assetSnippets(file);
  const url = absoluteFileUrl(file);
  const isImage = isImageFile(file);
  const isVideo = isVideoFile(file);
  const isAudio = isAudioFile(file);
  const previewable = isImage || isVideo || isAudio;

  async function handleCopy(snippet: Snippet) {
    setCopyError('');
    try {
      await copyText(snippet.value);
      setCopiedKey(snippet.key);
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : '复制失败');
    }
  }

  const metaRows: Array<[string, string]> = [
    ['文件名称', file.name || '-'],
    ['素材分类', file.category || '-'],
    ['文件后缀', file.suffix ? file.suffix.toUpperCase() : '-'],
    ['文件大小', file.sizeInfo || '-'],
    ...(fileResolution(file) ? [['分辨率', fileResolution(file)] as [string, string]] : []),
    ['存储引擎', file.engine || '-'],
    ['上传时间', file.createTime ? formatDateTime(file.createTime) : '-'],
    ['素材 ID', file.id],
  ];

  return (
    <CategoryModal
      title={file.name || '素材详情'}
      subtitle={`${file.sizeInfo || ''}${file.suffix ? ` · ${file.suffix.toUpperCase()}` : ''}`}
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {previewable && onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="h-9 px-4 rounded-xl bg-white border border-[#E5E5EA] text-[13px] font-medium text-[#3A3A3C] hover:bg-[#F5F5F7] transition-colors"
            >
              预览素材
            </button>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-4 rounded-xl bg-white border border-[#E5E5EA] text-[13px] font-medium text-[#3A3A3C] hover:bg-[#F5F5F7] transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              下载
            </a>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="h-9 px-4 rounded-xl bg-white border border-[#FF3B30]/30 text-[13px] font-medium text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors"
            >
              删除
            </button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">
        {/* 缩略 */}
        <div className="rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] overflow-hidden aspect-[4/3] md:aspect-square flex items-center justify-center">
          {isImage && !thumbFailed ? (
            <FileMedia
              file={file}
              src={url}
              alt={file.name || '素材'}
              className="w-full h-full object-cover"
              onError={() => setThumbFailed(true)}
            />
          ) : isVideo ? (
            <Film className="w-10 h-10 text-[#C7C7CC]" strokeWidth={1.2} />
          ) : isAudio ? (
            <Music className="w-10 h-10 text-[#C7C7CC]" strokeWidth={1.2} />
          ) : (
            <ImageOff className="w-10 h-10 text-[#C7C7CC]" strokeWidth={1.2} />
          )}
        </div>

        {/* 元信息 */}
        <dl className="divide-y divide-[#F2F2F7] min-w-0">
          {metaRows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[80px_1fr] gap-3 py-2 text-[13px]">
              <dt className="text-[#86868B]">{label}</dt>
              <dd className="text-[#1D1D1F] break-all min-w-0">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 引用代码 */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[13px] font-semibold text-[#1D1D1F]">引用地址</h4>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-[#0071E3] inline-flex items-center gap-1 hover:underline"
            >
              新窗口打开
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        {snippets.length === 0 ? (
          <p className="text-[12px] text-[#86868B]">该素材没有公开访问地址，请通过下载查看。</p>
        ) : (
          <div className="space-y-2">
            {snippets.map((snippet) => (
              <div
                key={snippet.key}
                className="flex items-start gap-2 rounded-xl bg-[#F5F5F7] px-3 py-2"
              >
                <span className="text-[11px] font-medium text-[#86868B] w-[68px] shrink-0 pt-0.5">
                  {snippet.label}
                </span>
                <code className="flex-1 min-w-0 text-[12px] text-[#3A3A3C] break-all font-mono max-h-[54px] overflow-y-auto">
                  {snippet.value}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopy(snippet)}
                  aria-label={`复制${snippet.label}`}
                  className="shrink-0 h-6 px-2 rounded-md bg-white border border-[#E5E5EA] text-[11px] font-medium text-[#3A3A3C] hover:text-[#0071E3] inline-flex items-center gap-1 transition-colors"
                >
                  {copiedKey === snippet.key ? (
                    <>
                      <Check className="w-3 h-3" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      复制
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
        {copyError && <p className="mt-2 text-[12px] text-[#D70015]">{copyError}</p>}
      </div>
    </CategoryModal>
  );
}

const EDIT_INPUT_CLASS =
  'w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-transparent text-[13px] text-[#1D1D1F] placeholder:text-[#AEAEB2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 focus:border-[#0071E3]/30 transition-all';
const EDIT_LABEL_CLASS = 'block text-[12px] font-medium text-[#3A3A3C] mb-1.5';

interface MaterialEditDialogProps {
  file: DevFile;
  onClose: () => void;
  onSubmit: (payload: { name: string; resolution: string }) => Promise<void>;
}

/** 编辑素材信息：标题与分辨率（分辨率留空则回退为自动读取） */
export function MaterialEditDialog({ file, onClose, onSubmit }: MaterialEditDialogProps) {
  const [name, setName] = useState(file.name || '');
  const [resolution, setResolution] = useState(fileResolution(file));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    const nextName = name.trim();
    if (!nextName) {
      setError('素材标题不能为空');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit({ name: nextName, resolution: resolution.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请稍后重试');
      setBusy(false);
    }
  }

  return (
    <CategoryModal
      title="编辑素材信息"
      subtitle={file.name || '素材'}
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            取消
          </SecondaryButton>
          <PrimaryButton onClick={() => void save()} busy={busy}>
            保存
          </PrimaryButton>
        </>
      }
    >
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-4"
      >
        <div>
          <label className={EDIT_LABEL_CLASS}>标题</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
            autoFocus
            placeholder="请输入素材标题"
            className={EDIT_INPUT_CLASS}
          />
        </div>

        <div>
          <label className={EDIT_LABEL_CLASS}>分辨率</label>
          <input
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            maxLength={32}
            placeholder="如 1920×1080"
            className={EDIT_INPUT_CLASS}
          />
          <p className="mt-1 text-[11px] text-[#86868B]">留空则按文件自动读取</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#F5F5F7] px-3 py-2">
            <div className="text-[11px] text-[#86868B]">文件大小</div>
            <div className="mt-0.5 text-[12px] text-[#1D1D1F] tabular-nums">
              {file.sizeInfo || '-'}
            </div>
          </div>
          <div className="rounded-xl bg-[#F5F5F7] px-3 py-2">
            <div className="text-[11px] text-[#86868B]">文件格式</div>
            <div className="mt-0.5 text-[12px] text-[#1D1D1F] uppercase">
              {(file.suffix || '').replace('.', '') || file.category || '-'}
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-[#FF3B30]/8 px-3 py-2 text-[12px] text-[#D70015]">{error}</p>
        )}
      </form>
    </CategoryModal>
  );
}
