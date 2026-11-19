import { AnimatePresence, motion } from 'motion/react';
import { Check, Heart, Send, X } from 'lucide-react';
import type { MessageItem } from '../data/content.ts';
import { useMemo, useState, type FormEvent } from 'react';
import { APPLE_EASE, SWIFTUI_SMOOTH, SWIFTUI_SNAPPY } from '../lib/motion.ts';

type SortMode = 'latest' | 'hot';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-9 h-9 rounded-full object-cover bg-[#F2F2F7] dark:bg-white/10 shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-[#F2F2F7] dark:bg-white/[0.08] flex items-center justify-center text-[#6E6E73] dark:text-[#D1D1D6] text-[13px] font-medium shrink-0">
      {(name || '访').slice(0, 1).toUpperCase()}
    </div>
  );
}

export interface MessageAuthor {
  name: string;
  email?: string;
  avatar?: string;
}

export default function MessagesView({
  messages,
  likedIds,
  searchQuery,
  isLoggedIn,
  currentUser,
  onRequireLogin,
  onToggleLike,
  onAddMessage,
}: {
  messages: MessageItem[];
  likedIds: Set<string>;
  searchQuery: string;
  isLoggedIn: boolean;
  currentUser: MessageAuthor;
  onRequireLogin: () => void;
  onToggleLike: (id: string) => void;
  onAddMessage: (message: MessageItem) => void | Promise<void>;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [content, setContent] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const visibleMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = messages.filter((m) => {
      if (!q) return true;
      return [m.nickname, m.content, m.reply]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q));
    });
    return [...list].sort((a, b) =>
      sortMode === 'hot'
        ? b.likes - a.likes || b.createdAt.localeCompare(a.createdAt)
        : b.createdAt.localeCompare(a.createdAt)
    );
  }, [messages, searchQuery, sortMode]);

  function openComposer() {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    setHint(null);
    setComposerOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = content.trim();
    if (!text) {
      setHint('请填写留言内容');
      return;
    }

    setSubmitting(true);
    setHint(null);
    const newMessage: MessageItem = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nickname: currentUser.name,
      email: currentUser.email || undefined,
      avatar: currentUser.avatar,
      content: text,
      createdAt: new Date().toISOString(),
      likes: 0,
      status: 'APPROVED',
    };

    try {
      await onAddMessage(newMessage);
      setContent('');
      setSortMode('latest');
      setComposerOpen(false);
      setHint('留言已发布');
    } catch (err) {
      setHint(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="messages-heading" className="space-y-6">
      <div className="max-w-[1440px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: APPLE_EASE }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6"
        >
          <div>
            <p className="text-xs font-medium tracking-wide text-[#0071E3] dark:text-[#0A84FF] mb-1.5">
              留言与回应
            </p>
            <h1
              id="messages-heading"
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]"
            >
              留言墙
            </h1>
          </div>

          <button
            type="button"
            onClick={openComposer}
            className="h-10 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium self-start md:self-auto"
          >
            写留言
          </button>
        </motion.div>

        <AnimatePresence>
          {hint && !composerOpen && (
            <motion.div
              key={hint}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className={`mb-6 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-[13px] ${
                hint.startsWith('留言已')
                  ? 'bg-[#16A34A]/10 text-[#16A34A]'
                  : 'bg-[#FF3B30]/10 text-[#D70015]'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Check className="w-4 h-4" />
                {hint}
              </span>
              <button
                type="button"
                onClick={() => setHint(null)}
                aria-label="关闭提示"
                className="opacity-70 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              全部留言
            </h2>
            <span className="text-[11px] text-[#AEAEB2] tabular-nums">{visibleMessages.length}</span>
          </div>
          <div className="inline-flex items-center p-1 rounded-xl bg-[#EEEEF0] dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06]">
            {(
              [
                { key: 'latest', label: '最新' },
                { key: 'hot', label: '最热' },
              ] as { key: SortMode; label: string }[]
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSortMode(item.key)}
                aria-pressed={sortMode === item.key}
                className={`relative px-3.5 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors ${
                  sortMode === item.key
                    ? 'text-[#1D1D1F] dark:text-white'
                    : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
                }`}
              >
                {sortMode === item.key && (
                  <motion.span
                    layoutId="message-sort-pill"
                    transition={SWIFTUI_SNAPPY}
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#2C2C2E] shadow-xs"
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {visibleMessages.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-[#161618] border border-black/[0.06] dark:border-white/[0.08] py-20 text-center space-y-2">
            <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              {searchQuery ? '没有找到匹配的留言' : '还没有留言'}
            </p>
            <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
              {searchQuery ? '换个关键词试试' : '来写第一条吧'}
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-5">
            {visibleMessages.map((message, index) => {
              const isLiked = likedIds.has(message.id);
              return (
                <motion.article
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SWIFTUI_SMOOTH, delay: Math.min(index, 8) * 0.03 }}
                  className="break-inside-avoid mb-4 sm:mb-5 rounded-2xl bg-white dark:bg-[#161618] border border-black/[0.05] dark:border-white/[0.07] p-4 sm:p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <Avatar name={message.nickname} src={message.avatar} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        {message.nickname}
                      </div>
                      <div className="text-[11px] text-[#8E8E93] dark:text-[#98989D] mt-0.5 tabular-nums">
                        {formatDate(message.createdAt)}
                      </div>
                    </div>
                  </div>

                  <p className="text-[13px] sm:text-sm leading-6 text-[#3A3A3C] dark:text-[#D1D1D6] whitespace-pre-wrap break-words">
                    {message.content}
                  </p>

                  {message.reply && (
                    <div className="mt-3 rounded-xl bg-[#F5F5F7] dark:bg-white/[0.05] px-3.5 py-2.5">
                      <div className="text-[11px] font-medium text-[#0071E3] dark:text-[#0A84FF] mb-1">
                        回复 · {message.replyAt ? formatDate(message.replyAt) : ''}
                      </div>
                      <p className="text-[12px] leading-5 text-[#6E6E73] dark:text-[#A1A1A6] whitespace-pre-wrap">
                        {message.reply}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-[#F2F2F7] dark:border-white/[0.06] flex justify-end">
                    <motion.button
                      type="button"
                      onClick={() => onToggleLike(message.id)}
                      whileTap={{ scale: 0.88 }}
                      transition={SWIFTUI_SNAPPY}
                      aria-label={isLiked ? '取消点赞' : '点赞'}
                      aria-pressed={isLiked}
                      className={`inline-flex items-center gap-1 text-[12px] transition-colors ${
                        isLiked
                          ? 'text-[#FF2E4D]'
                          : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#FF2E4D]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`}
                        strokeWidth={1.8}
                      />
                      <span className="tabular-nums">{message.likes}</span>
                    </motion.button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {composerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !submitting) setComposerOpen(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="写下留言"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={SWIFTUI_SMOOTH}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-black/[0.06] dark:border-white/10 bg-white dark:bg-[#1C1C1E] shadow-xl"
            >
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#F2F2F7] dark:border-white/[0.06]">
                <h2 className="text-[16px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  写留言
                </h2>
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  disabled={submitting}
                  aria-label="关闭"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] dark:hover:bg-white/[0.06] disabled:opacity-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(event) => void handleSubmit(event)} className="p-6">
                <div className="flex items-center gap-3 mb-5 rounded-xl bg-[#F5F5F7] dark:bg-white/[0.05] p-3">
                  <Avatar name={currentUser.name} src={currentUser.avatar} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[12px] text-[#86868B] truncate">
                      {currentUser.email || '以登录身份发布'}
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-2">
                    留言内容 <span className="text-[#D70015]">*</span>
                  </span>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={500}
                    rows={5}
                    autoFocus
                    placeholder="说点什么..."
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F5F7] dark:bg-white/[0.06] border border-transparent text-[14px] leading-6 text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#AEAEB2] focus:bg-white dark:focus:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 transition-all resize-none"
                  />
                  <span className="block mt-1.5 text-right text-[11px] text-[#AEAEB2] tabular-nums">
                    {content.length} / 500
                  </span>
                </label>

                <AnimatePresence mode="wait">
                  {hint && (
                    <motion.p
                      key={hint}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#D70015]"
                    >
                      <X className="w-3.5 h-3.5" />
                      {hint}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    disabled={submitting}
                    className="h-10 px-4 rounded-xl bg-[#F5F5F7] dark:bg-white/[0.06] text-[13px] font-medium text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-[#EDEDF0] dark:hover:bg-white/[0.1] disabled:opacity-50 transition-colors"
                  >
                    取消
                  </button>
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileTap={{ scale: 0.98 }}
                    transition={SWIFTUI_SNAPPY}
                    className="h-10 px-5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                      />
                    ) : (
                      <Send className="w-3.5 h-3.5" strokeWidth={2} />
                    )}
                    {submitting ? '提交中' : '提交留言'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
