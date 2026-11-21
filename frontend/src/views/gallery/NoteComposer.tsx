import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ImagePlus, Loader2, Sparkles, Undo2, X } from 'lucide-react';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { portalApi } from '../../lib/api';
import { publicFileUrl } from '../../lib/systemInfo';

/** 小红书风格卡片主题：与后端 BizGraphicPosterService 的主题一一对应 */
const THEMES = [
  { value: 'warm', label: '暖橙', bg: 'linear-gradient(160deg,#FFF5EE,#FFE2D6)', accent: '#FF6D5A' },
  { value: 'mint', label: '薄荷', bg: 'linear-gradient(160deg,#EEFAF6,#D6F0E8)', accent: '#18A88A' },
  { value: 'sky', label: '晴空', bg: 'linear-gradient(160deg,#F0F6FF,#D6E6FC)', accent: '#0071E3' },
  { value: 'lilac', label: '丁香', bg: 'linear-gradient(160deg,#F7F3FF,#E7DBFC)', accent: '#8C5CEC' },
  { value: 'cream', label: '奶油', bg: 'linear-gradient(160deg,#FFFCF4,#F6ECD6)', accent: '#D69E2E' },
] as const;

const MAX_CONTENT = 1000;

interface NoteComposerProps {
  open: boolean;
  authorName?: string;
  onClose: () => void;
  /** 应用（发布）成功后回调，用于刷新列表 */
  onPublished: () => void;
}

/**
 * 图文生成器（类小红书）
 *
 * 两段式交互：
 * 1. 编辑阶段：输入标题 / 正文 / 主题，点「生成预览」，显示加载态；
 * 2. 结果阶段：弹窗展示后端渲染出的图片，可逐张「应用」或整体「全部应用」，
 *    也可「放弃」回到编辑继续修改。应用即代表该笔记正式发布。
 */
export function NoteComposer({ open, authorName, onClose, onPublished }: NoteComposerProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [theme, setTheme] = useState<string>('warm');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  /** 生成结果：后端返回的图片地址（已转成可访问 URL） */
  const [generated, setGenerated] = useState<string[]>([]);
  /** 已应用（保留）的图片下标 */
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const activeTheme = THEMES.find((item) => item.value === theme) ?? THEMES[0];
  const previewTitle = (title.trim() || content.split('\n').find((line) => line.trim()) || '')
    .trim()
    .slice(0, 20);

  // 打开时聚焦正文输入；关闭时重置到编辑阶段
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => contentRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  // 关闭后清空生成结果，下次打开是干净的编辑态
  useEffect(() => {
    if (open) return;
    setGenerated([]);
    setApplied(new Set());
    setError('');
    setGenerating(false);
    setApplying(false);
  }, [open]);

  // Esc：加载/应用中不响应，避免状态错乱
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (generating || applying) return;
      if (generated.length) {
        // 结果阶段先退回编辑
        setGenerated([]);
        setApplied(new Set());
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, generating, applying, generated.length, onClose]);

  const canGenerate = useMemo(
    () => content.trim().length > 0 && content.length <= MAX_CONTENT && !generating,
    [content, generating]
  );

  /** 调用后端渲染图片，成功后切到结果弹窗 */
  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setError('');
    try {
      const graphic = await portalApi.createGraphicPoster({
        content: content.trim(),
        title: title.trim() || undefined,
        nickname: authorName,
        theme,
      });
      const images = (graphic.images?.length ? graphic.images : [graphic.cover])
        .map((url) => publicFileUrl(url))
        .filter((url): url is string => !!url);
      if (!images.length) throw new Error('图片生成失败，请重试');
      setGenerated(images);
      setApplied(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  }

  /** 单张应用 / 取消应用：仅影响保留结果，真正落库在「完成发布」时 */
  function toggleApplied(index: number) {
    setApplied((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  /** 全部应用：按当前结果全选 */
  function applyAll() {
    setApplied(new Set(generated.map((_, index) => index)));
  }

  /**
   * 完成发布。
   * 后端生成时已入库一张笔记，这里同步「应用的图片」：
   * 未全选则调用一次带筛选的发布（重新入库仅保留的图片），
   * 全选时无需重复入库，直接刷新列表关闭弹窗。
   */
  async function handleApplyResult() {
    if (!generated.length || applying) return;
    const picked = generated.filter((_, index) => applied.has(index));
    if (!picked.length) {
      setError('请至少应用一张图片');
      return;
    }
    setApplying(true);
    setError('');
    try {
      // 全选：生成时已入库，直接收尾
      if (picked.length !== generated.length) {
        await portalApi.createGraphicPosterImages({
          content: content.trim(),
          title: title.trim() || undefined,
          nickname: authorName,
          theme,
          images: picked,
        });
      }
      setTitle('');
      setContent('');
      setGenerated([]);
      setApplied(new Set());
      onPublished();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '应用失败，请稍后重试');
    } finally {
      setApplying(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm px-0 sm:px-4"
          onClick={() => !generating && !applying && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={SWIFTUI_SMOOTH}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={generated.length ? '图文生成结果' : '发布图文笔记'}
            className="relative w-full sm:max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-[#161618] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* 顶部标题栏 */}
            <div className="shrink-0 flex items-center justify-between px-5 h-14 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF2E4D]" />
                <span className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {generated.length ? '生成结果' : '发布图文笔记'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (generating || applying) return;
                  if (generated.length) {
                    setGenerated([]);
                    setApplied(new Set());
                    return;
                  }
                  onClose();
                }}
                className="p-2 rounded-full text-[#86868B] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                aria-label={generated.length ? '返回编辑' : '关闭'}
                title={generated.length ? '放弃结果，返回编辑' : '关闭'}
              >
                {generated.length ? <Undo2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </button>
            </div>

            {/* 编辑阶段 */}
            {generated.length === 0 ? (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-5 p-5">
                  <div className="min-w-0 space-y-4">
                    <label className="block">
                      <span className="block mb-1.5 text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                        标题 <span className="text-[#86868B] font-normal">（可选）</span>
                      </span>
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value.slice(0, 60))}
                        maxLength={60}
                        placeholder="一句话说清重点"
                        className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] dark:border-white/[0.14] bg-white dark:bg-white/[0.04] text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:border-[#0071E3]"
                      />
                    </label>

                    <label className="block">
                      <span className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">正文</span>
                        <span
                          className={`text-[11px] tabular-nums ${
                            content.length > MAX_CONTENT ? 'text-[#CF1322]' : 'text-[#86868B]'
                          }`}
                        >
                          {content.length}/{MAX_CONTENT}
                        </span>
                      </span>
                      <textarea
                        ref={contentRef}
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        rows={9}
                        maxLength={MAX_CONTENT}
                        placeholder="写下你想分享的内容，点击生成预览即可排版成图片笔记…"
                        className="w-full px-3 py-2.5 rounded-xl border border-[#D2D2D7] dark:border-white/[0.14] bg-white dark:bg-white/[0.04] text-[13px] leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:border-[#0071E3] resize-none"
                      />
                    </label>

                    <div>
                      <span className="block mb-1.5 text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                        卡片主题
                      </span>
                      <div role="radiogroup" aria-label="卡片主题" className="flex flex-wrap gap-2">
                        {THEMES.map((item) => {
                          const active = item.value === theme;
                          return (
                            <button
                              key={item.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => setTheme(item.value)}
                              className={`h-8 px-3 rounded-full text-[12px] inline-flex items-center gap-1.5 transition-colors ${
                                active
                                  ? 'bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F]'
                                  : 'bg-[#F5F5F7] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#98989D] hover:bg-[#EBEBF0]'
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

                    {error && (
                      <div className="px-3 py-2 rounded-xl bg-[#FFF1F0] border border-[#FFCCC7] text-[12px] text-[#CF1322]">
                        {error}
                      </div>
                    )}
                  </div>

                  {/* 右侧即时预览：与后端渲染的版式保持一致 */}
                  <div className="hidden sm:block">
                    <span className="block mb-1.5 text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      效果预览
                    </span>
                    <div
                      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden p-4 flex flex-col"
                      style={{ background: activeTheme.bg }}
                    >
                      <span
                        className="block w-8 h-1 rounded-full mb-3"
                        style={{ background: activeTheme.accent }}
                      />
                      {previewTitle && (
                        <p className="text-[15px] font-semibold leading-snug text-[#26201E] mb-2 line-clamp-2">
                          {previewTitle}
                        </p>
                      )}
                      <p className="flex-1 min-h-0 overflow-hidden text-[11px] leading-[1.8] text-[#4A403C] whitespace-pre-wrap break-words">
                        {content || '正文会以自动排版的方式渲染成图片'}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[9px] text-[#8A8078]">
                        <span className="truncate max-w-[70%]">{authorName || '匿名用户'}</span>
                        <span className="tabular-nums">1 / n</span>
                      </div>
                    </div>
                    <p className="mt-2 flex items-start gap-1 text-[11px] leading-relaxed text-[#86868B]">
                      <ImagePlus className="w-3 h-3 mt-0.5 shrink-0" />
                      点击「生成预览」由服务端渲染高清图，超出一屏自动分页。
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-[#FAFAFC] dark:bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => !generating && onClose()}
                    className="h-9 px-4 rounded-full border border-[#D2D2D7] dark:border-white/[0.14] text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-white"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="h-9 px-5 rounded-full bg-[#FF2E4D] text-white text-[13px] font-medium hover:bg-[#F0243F] disabled:opacity-40 inline-flex items-center gap-1.5"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        生成中…
                      </>
                    ) : (
                      '生成预览'
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* 结果阶段：展示渲染出的图片，可逐张应用 */
              <>
                <div className="flex-1 min-h-0 overflow-y-auto p-5">
                  <p className="mb-3 text-[12px] text-[#86868B]">
                    共 {generated.length} 张，点击「应用」保留该张，未应用的图片不会发布。
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {generated.map((url, index) => {
                      const isApplied = applied.has(index);
                      return (
                        <button
                          key={`${url}-${index}`}
                          type="button"
                          onClick={() => toggleApplied(index)}
                          disabled={applying}
                          className={`group relative rounded-xl overflow-hidden border-2 transition-colors ${
                            isApplied
                              ? 'border-[#FF2E4D]'
                              : 'border-transparent hover:border-[#D2D2D7]'
                          }`}
                          aria-pressed={isApplied}
                          aria-label={`第 ${index + 1} 张，${isApplied ? '已应用' : '未应用'}`}
                        >
                          <img
                            src={url}
                            alt={`生成结果第 ${index + 1} 张`}
                            className="w-full aspect-[3/4] object-cover bg-[#F5F5F7]"
                            loading="lazy"
                          />
                          <span className="absolute left-2 top-2 px-1.5 py-0.5 rounded-full bg-black/45 text-[10px] text-white backdrop-blur-sm tabular-nums">
                            {index + 1}
                          </span>
                          {isApplied && (
                            <span className="absolute right-2 top-2 w-6 h-6 rounded-full bg-[#FF2E4D] text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span
                            className={`absolute inset-x-0 bottom-0 py-1.5 text-[11px] font-medium text-white ${
                              isApplied
                                ? 'bg-[#FF2E4D]/90'
                                : 'bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity'
                            }`}
                          >
                            {isApplied ? '已应用' : '点击应用'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {error && (
                    <div className="mt-3 px-3 py-2 rounded-xl bg-[#FFF1F0] border border-[#FFCCC7] text-[12px] text-[#CF1322]">
                      {error}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2 px-5 py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-[#FAFAFC] dark:bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => {
                      if (applying) return;
                      setGenerated([]);
                      setApplied(new Set());
                      setError('');
                    }}
                    disabled={applying}
                    className="h-9 px-4 rounded-full text-[13px] text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] inline-flex items-center gap-1.5"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    放弃
                  </button>
                  <span className="ml-auto text-[11px] text-[#86868B] tabular-nums">
                    已应用 {applied.size}/{generated.length}
                  </span>
                  <button
                    type="button"
                    onClick={applyAll}
                    disabled={applying}
                    className="h-9 px-4 rounded-full border border-[#D2D2D7] dark:border-white/[0.14] text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-white"
                  >
                    全部应用
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyResult}
                    disabled={applying || applied.size === 0}
                    className="h-9 px-5 rounded-full bg-[#FF2E4D] text-white text-[13px] font-medium hover:bg-[#F0243F] disabled:opacity-40 inline-flex items-center gap-1.5"
                  >
                    {applying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        提交中…
                      </>
                    ) : (
                      '完成发布'
                    )}
                  </button>
                </div>
              </>
            )}

            {/* 生成中的全屏遮罩，避免重复点击与误操作 */}
            <AnimatePresence>
              {generating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/70 dark:bg-black/60 backdrop-blur-sm"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="w-7 h-7 animate-spin text-[#FF2E4D]" />
                  <p className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    正在生成图文…
                  </p>
                  <p className="text-[11px] text-[#86868B]">服务端排版约需 1–3 秒</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
