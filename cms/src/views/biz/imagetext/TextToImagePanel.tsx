/**
 * 文本转图文（模态框）
 * ------------------------------------------------------------------
 * 正文与主题都在弹窗内维护，生成结果也在同一弹窗内勾选并应用。
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { api } from '../../../lib/api.ts';

/** 与后端 BizGraphicPosterService 主题一一对应 */
const THEMES = [
  { value: 'warm', label: '暖橙', accent: '#FF6D5A' },
  { value: 'mint', label: '薄荷', accent: '#18A88A' },
  { value: 'sky', label: '晴空', accent: '#0071E3' },
  { value: 'lilac', label: '丁香', accent: '#8C5CEC' },
  { value: 'cream', label: '奶油', accent: '#D69E2E' },
];

/** 与后端 @Size(max = 1000) 对齐 */
const MAX_CONTENT = 1000;

interface TextToImagePanelProps {
  open: boolean;
  onClose: () => void;
  /** 卡片标题：取自左侧「图文标题」 */
  cardTitle: string;
  /** 用左侧「图文配文」预填弹窗正文 */
  initialContent?: string;
  /** 应用勾选的图片（后端返回的 data URI） */
  onApply: (urls: string[]) => void;
}

export function TextToImagePanel({
  open,
  onClose,
  cardTitle,
  initialContent = '',
  onApply,
}: TextToImagePanelProps) {
  const [content, setContent] = useState(initialContent);
  const [theme, setTheme] = useState('warm');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  /** 标题优先取左侧「图文标题」，为空时由后端自动取正文首行 */
  const trimmedTitle = cardTitle.trim();

  const canGenerate = useMemo(
    () => content.trim().length > 0 && content.length <= MAX_CONTENT && !generating,
    [content, generating]
  );

  useEffect(() => {
    if (!open) return;
    setContent(initialContent);
    setError('');
    setResults([]);
    setPicked(new Set());
  }, [open, initialContent]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !generating) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, generating, onClose]);

  if (!open) return null;

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setError('');
    try {
      const urls = await api.renderGraphicPoster({
        content: content.trim(),
        title: trimmedTitle,
        nickname: undefined,
        theme,
      });
      if (!urls.length) throw new Error('未生成任何图片，请调整内容后重试');
      setResults(urls);
      setPicked(new Set(urls.map((_, index) => index)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  }

  function togglePick(index: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E5E5EA] overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-6 h-16 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FF2E4D]" />
            <span className="text-[16px] font-semibold text-[#1D1D1F]">文本转图文</span>
            <span className="text-[11px] text-[#86868B]">输入正文自动排版成 9:16 图片</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#F5F5F7]"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          <div className="w-full lg:w-[38%] shrink-0 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[#E5E5EA] p-6 space-y-4">
            <div className="rounded-xl bg-[#F5F5F7] px-3 py-2 text-[12px] text-[#6E6E73]">
              卡片标题：
              <span className={trimmedTitle ? 'font-medium text-[#1D1D1F]' : ''}>
                {trimmedTitle || '未填写，将自动取正文首行'}
              </span>
            </div>

            <div>
              <span className="block mb-2 text-[12px] font-medium text-[#1D1D1F]">卡片主题</span>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((item) => {
                  const active = item.value === theme;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setTheme(item.value)}
                      className={`h-9 px-3 rounded-xl text-[12px] inline-flex items-center gap-1.5 transition-colors ${
                        active
                          ? 'bg-[#1D1D1F] text-white'
                          : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#EBEBF0]'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: item.accent }}
                        aria-hidden="true"
                      />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#1D1D1F]">正文</span>
                <span
                  className={`text-[11px] tabular-nums ${
                    content.length > MAX_CONTENT ? 'text-[#CF1322]' : 'text-[#86868B]'
                  }`}
                >
                  {content.length}/{MAX_CONTENT}
                </span>
              </span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={10}
                maxLength={MAX_CONTENT}
                placeholder="粘贴或输入正文，点击「预览生成」后由服务端排版成图片"
                className="w-full px-3 py-2.5 rounded-xl border border-[#D2D2D7] bg-white text-[13px] leading-relaxed outline-none focus:border-[#0071E3] resize-none"
              />
            </label>

            {error && (
              <div className="px-3 py-2 rounded-xl bg-[#FFF1F0] border border-[#FFCCC7] text-[12px] text-[#CF1322]">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              className="h-10 w-full rounded-xl bg-[#0071E3] text-white text-[13px] font-medium hover:bg-[#0077ED] disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  预览生成
                </>
              )}
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {results.length === 0 ? (
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[#E5E5EA] bg-[#FAFAFC] text-[13px] text-[#8E8E93]">
                在左侧输入正文并生成，结果会显示在这里
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {results.map((url, index) => {
                  const active = picked.has(index);
                  return (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      onClick={() => togglePick(index)}
                      aria-pressed={active}
                      className={`relative overflow-hidden rounded-xl bg-[#F2F2F7] border-2 transition-colors ${
                        active ? 'border-[#0071E3]' : 'border-transparent hover:border-[#D2D2D7]'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`生成结果第 ${index + 1} 张`}
                        loading="lazy"
                        className="w-full aspect-[3/4] object-cover"
                      />
                      <span className="absolute left-2 top-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white tabular-nums">
                        {index + 1}
                      </span>
                      {active && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0071E3] text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E5EA] bg-[#FAFAFC]">
          <span className="mr-auto text-[12px] text-[#86868B] tabular-nums">
            已选 {picked.size}/{results.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-[#D2D2D7] text-[13px] text-[#1D1D1F] hover:bg-white"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!picked.size}
            onClick={() => {
              const urls = results.filter((_, index) => picked.has(index));
              if (!urls.length) return;
              onApply(urls);
              onClose();
            }}
            className="h-9 px-4 rounded-xl bg-[#0071E3] text-white text-[13px] font-medium hover:bg-[#0077ED] disabled:opacity-50"
          >
            应用选中（{picked.size}）
          </button>
        </div>
      </div>
    </div>
  );
}
