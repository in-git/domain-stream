/**
 * 文本转图文（面板 + 结果弹窗）
 * ------------------------------------------------------------------
 * 面板内直接输入正文并点击「预览生成」，脚本意义上的输入区留在页面上；
 * 生成完成后弹出模态框展示图片，可逐张勾选后应用回图文编辑器。
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
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
  /** 写入卡片页脚的作者昵称 */
  authorName?: string;
  /** 卡片标题：直接取自左侧「图文标题」，不再由正文截取 */
  cardTitle: string;
  /** 应用勾选的图片 */
  onApply: (urls: string[]) => void;
}

export function TextToImagePanel({ authorName, cardTitle, onApply }: TextToImagePanelProps) {
  const [content, setContent] = useState('');
  const [theme, setTheme] = useState('warm');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  /** 结果弹窗开关 */
  const [resultOpen, setResultOpen] = useState(false);
  /** 生成结果（后端原始地址） */
  const [results, setResults] = useState<string[]>([]);
  /** 勾选的图片下标 */
  const [picked, setPicked] = useState<Set<number>>(new Set());

  /** 标题来自左侧「图文标题」，为空时不允许生成 */
  const trimmedTitle = cardTitle.trim();

  const canGenerate = useMemo(
    () =>
      trimmedTitle.length > 0 &&
      content.trim().length > 0 &&
      content.length <= MAX_CONTENT &&
      !generating,
    [trimmedTitle, content, generating]
  );

  // Esc 关闭结果弹窗；生成中不响应，避免状态错乱
  useEffect(() => {
    if (!resultOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !generating) setResultOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resultOpen, generating]);

  async function handleGenerate() {
    // 标题是卡片的必要信息，缺失时提示而不是偷偷用正文代替
    if (!trimmedTitle) {
      setError('请先在左侧「图文标题」中填写标题，再生成图文');
      return;
    }
    if (!canGenerate) return;
    setGenerating(true);
    setError('');
    try {
      const urls = await api.renderGraphicPoster({
        content: content.trim(),
        // 卡片标题固定使用左侧配好的标题
        title: trimmedTitle,
        nickname: authorName,
        theme,
      });
      if (!urls.length) throw new Error('未生成任何图片，请调整内容后重试');
      setResults(urls);
      // 默认全选，运营按需取消
      setPicked(new Set(urls.map((_, index) => index)));
      setResultOpen(true);
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
    <div className="rounded-2xl border border-[#E5E5EA] bg-white p-4 space-y-3.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-[#FF2E4D]" />
        <span className="text-[13px] font-medium text-[#1D1D1F]">文本转图文</span>
        <span className="text-[11px] text-[#86868B]">输入文字自动排版成 9:16 图片</span>
      </div>

      {/* 卡片标题复用左侧基础信息，避免两处维护 */
      /* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <div
        className={`rounded-xl px-3 py-2 text-[12px] ${
          trimmedTitle
            ? 'bg-[#F5F5F7] text-[#6E6E73]'
            : 'bg-[#FFF1F0] border border-[#FFCCC7] text-[#CF1322]'
        }`}
      >
        {trimmedTitle ? (
          <>
            卡片标题：<span className="font-medium text-[#1D1D1F]">{trimmedTitle}</span>
            <span className="text-[#86868B]">（取自左侧「图文标题」）</span>
          </>
        ) : (
          '请先在左侧「图文标题」中填写标题，否则无法生成图片'
        )}
      </div>

      <div>
        <span className="block mb-1.5 text-[12px] font-medium text-[#1D1D1F]">卡片主题</span>
        <div className="flex flex-wrap gap-1.5">
          {THEMES.map((item) => {
            const active = item.value === theme;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTheme(item.value)}
                className={`h-8 px-2.5 rounded-lg text-[12px] inline-flex items-center gap-1.5 transition-colors ${
                  active ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#EBEBF0]'
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
        <span className="flex items-center justify-between mb-1.5">
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
          rows={6}
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

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="h-9 px-4 rounded-xl bg-[#0071E3] text-white text-[12px] font-medium hover:bg-[#0077ED] disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              生成中…
            </>
          ) : (
            <>
              <ImagePlus className="w-4 h-4" />
              预览生成
            </>
          )}
        </button>
      </div>

      {/* 结果弹窗：生成完毕后才出现 */}
      {resultOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E5E5EA] overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-5 h-14 border-b border-[#E5E5EA]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF2E4D]" />
                <span className="text-[15px] font-semibold text-[#1D1D1F]">生成结果</span>
                <span className="text-[11px] text-[#86868B]">共 {results.length} 张</span>
              </div>
              <button
                type="button"
                onClick={() => setResultOpen(false)}
                className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#F5F5F7]"
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              <p className="mb-3 text-[12px] text-[#86868B]">
                点击图片可取消勾选；应用后加入图片列表，可继续调整顺序或移除。
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {results.map((url, index) => {
                  const active = picked.has(index);
                  return (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      onClick={() => togglePick(index)}
                      aria-pressed={active}
                      className={`relative rounded-xl overflow-hidden border-2 transition-colors ${
                        active ? 'border-[#0071E3]' : 'border-transparent hover:border-[#D2D2D7]'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`生成结果第 ${index + 1} 张`}
                        loading="lazy"
                        className="w-full aspect-[3/4] object-cover bg-[#F5F5F7]"
                      />
                      <span className="absolute left-1.5 top-1.5 px-1.5 py-0.5 rounded-md bg-black/50 text-[10px] text-white tabular-nums">
                        {index + 1}
                      </span>
                      {active && (
                        <span className="absolute right-1.5 top-1.5 w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#E5E5EA] bg-[#FAFAFC]">
              <span className="mr-auto text-[11px] text-[#86868B] tabular-nums">
                已选 {picked.size}/{results.length}
              </span>
              <button
                type="button"
                onClick={() => setResultOpen(false)}
                className="h-9 px-4 rounded-xl border border-[#D2D2D7] text-[13px] text-[#1D1D1F] hover:bg-white"
              >
                放弃
              </button>
              <button
                type="button"
                disabled={!picked.size}
                onClick={() => {
                  const urls = results.filter((_, index) => picked.has(index));
                  if (!urls.length) return;
                  onApply(urls);
                  setResultOpen(false);
                }}
                className="h-9 px-4 rounded-xl bg-[#0071E3] text-white text-[13px] font-medium hover:bg-[#0077ED] disabled:opacity-50"
              >
                应用选中（{picked.size}）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
