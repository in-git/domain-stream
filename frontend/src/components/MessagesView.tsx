import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Heart,
  LogIn,
  MessageCircleHeart,
  Send,
  X,
} from 'lucide-react';
import type { MessageItem } from '../data/content.ts';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { APPLE_EASE, SWIFTUI_BOUNCY, SWIFTUI_SMOOTH } from '../lib/motion.ts';

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
        className="w-10 h-10 rounded-[14px] object-cover ring-1 ring-black/5 dark:ring-white/10 shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#0071E3] to-[#5E5CE6] flex items-center justify-center text-white text-[15px] font-semibold shrink-0 shadow-[0_4px_12px_rgba(0,113,227,0.22)]">
      {(name || '访').slice(0, 1).toUpperCase()}
    </div>
  );
}

function StatusBadge({ status }: { status: MessageItem['status'] }) {
  if (status === 'APPROVED') return null;
  if (status === 'REJECTED') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#D70015]/10 text-[#D70015]">
        未通过
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#D97706]/10 text-[#B45309] dark:text-[#FBBF24]">
      待审核
    </span>
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

  const approvedCount = messages.filter((m) => m.status === 'APPROVED').length;

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
      status: 'PENDING',
    };

    try {
      await onAddMessage(newMessage);
      setContent('');
      setSortMode('latest');
      setComposerOpen(false);
      setHint('留言已提交，审核通过后将展示在留言墙');
    } catch (err) {
      setHint(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="messages-heading" className="space-y-8">
      <div className="max-w-[1440px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: APPLE_EASE }}
          className="flex flex-wrap items-start justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0071E3] to-[#5E5CE6] flex items-center justify-center shadow-[0_6px_18px_rgba(0,113,227,0.25)]">
                <MessageCircleHeart className="w-5 h-5 text-white" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-[28px] sm:text-[34px] lg:text-[38px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
                  留言墙
                </h1>
                <p className="text-[13px] text-[#86868B] dark:text-[#A1A1A6]">
                  关于作品、技术或任何想聊的，都可以在这里留下声音
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-[#86868B] dark:text-[#98989D]">
              <span>{messages.length} 条留言</span>
              <span className="w-px h-3 bg-[#D2D2D7]/60 dark:bg-[#424245]" />
              <span>{approvedCount} 条已展示</span>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={openComposer}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={SWIFTUI_BOUNCY}
            className="h-11 px-5 rounded-[14px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-[14px] font-medium inline-flex items-center gap-2 shadow-[0_6px_16px_rgba(0,113,227,0.25)]"
          >
           { '留言'}
           
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {hint && !composerOpen && (
            <motion.div
              key={hint}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className={`mb-6 flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 text-[13px] ${
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

        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              全部留言
            </h2>
            <span className="text-[12px] text-[#AEAEB2]">{visibleMessages.length}</span>
          </div>
          <div className="inline-flex p-1 rounded-full bg-[#F5F5F7] dark:bg-white/[0.06] border border-[#E8E8ED] dark:border-white/10">
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
                className={`relative px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  sortMode === item.key
                    ? 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                    : 'text-[#86868B] hover:text-[#3A3A3C] dark:hover:text-[#D1D1D6]'
                }`}
              >
                {sortMode === item.key && (
                  <motion.span
                    layoutId="message-sort-pill"
                    transition={SWIFTUI_SMOOTH}
                    className="absolute inset-0 rounded-full bg-white dark:bg-white/[0.12] shadow-sm"
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {visibleMessages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-[24px] border border-dashed border-[#D2D2D7] dark:border-white/15 py-20 text-center"
          >
            <MessageCircleHeart
              className="w-10 h-10 mx-auto mb-4 text-[#C7C7CC] dark:text-[#48484A]"
              strokeWidth={1.4}
            />
            <p className="text-[15px] font-medium text-[#3A3A3C] dark:text-[#D1D1D6]">
              {searchQuery ? '没有匹配的留言' : '还没有留言'}
            </p>
            <p className="mt-1.5 text-[13px] text-[#86868B]">
              {searchQuery ? '换个关键词试试' : '成为第一个在这里留下声音的人'}
            </p>
          </motion.div>
        ) : (
          <div className="columns-1 md:columns-2 xl:columns-3 gap-5">
            {visibleMessages.map((message, index) => {
              const isLiked = likedIds.has(message.id);
              return (
                <motion.article
                  key={message.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.04, ease: APPLE_EASE }}
                  className="break-inside-avoid mb-5 rounded-[22px] border border-[#E8E8ED] dark:border-white/10 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)] dark:hover:shadow-none transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar name={message.nickname} src={message.avatar} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                          {message.nickname}
                        </h3>
                        <StatusBadge status={message.status} />
                      </div>
                      <div className="text-[12px] text-[#AEAEB2] mt-0.5">
                        {formatDate(message.createdAt)}
                      </div>
                    </div>
                  </div>

                  <p className="text-[14px] leading-7 text-[#3A3A3C] dark:text-[#D1D1D6] whitespace-pre-wrap break-words">
                    {message.content}
                  </p>

                  {message.reply && (
                    <div className="mt-4 rounded-[14px] bg-[#F5F5F7] dark:bg-white/[0.05] border-l-2 border-[#0071E3] px-4 py-3">
                      <div className="text-[11px] font-medium text-[#0071E3] mb-1.5">
                        站点回复 · {message.replyAt ? formatDate(message.replyAt) : ''}
                      </div>
                      <p className="text-[13px] leading-6 text-[#6E6E73] dark:text-[#A1A1A6] whitespace-pre-wrap">
                        {message.reply}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-[#F2F2F7] dark:border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#AEAEB2]">
                      <MessageCircleHeart className="w-3.5 h-3.5" strokeWidth={1.7} />
                      <span>NO.{message.id.slice(-4).toUpperCase()}</span>
                    </div>
                    <motion.button
                      type="button"
                      onClick={() => onToggleLike(message.id)}
                      whileTap={{ scale: 0.9 }}
                      transition={SWIFTUI_BOUNCY}
                      aria-label={isLiked ? '取消点赞' : '点赞'}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                        isLiked
                          ? 'bg-[#FF3B30]/10 text-[#D70015]'
                          : 'bg-[#F5F5F7] dark:bg-white/[0.06] text-[#86868B] hover:text-[#D70015]'
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
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
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#E8E8ED] dark:border-white/10 bg-white dark:bg-[#1C1C1E] shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
            >
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#F2F2F7] dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[11px] bg-[#0071E3]/10 flex items-center justify-center">
                    <MessageCircleHeart className="w-4 h-4 text-[#0071E3]" strokeWidth={1.9} />
                  </div>
                  <h2 className="text-[16px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    写下留言
                  </h2>
                </div>
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
                <div className="flex items-center gap-3 mb-5 rounded-[14px] bg-[#F5F5F7] dark:bg-white/[0.05] p-3">
                  <Avatar name={currentUser.name} src={currentUser.avatar} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[12px] text-[#86868B] truncate">
                      {currentUser.email || '以登录身份发布'}
                    </div>
                  </div>
                  <Check className="w-4 h-4 ml-auto shrink-0 text-[#16A34A]" />
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
                    placeholder="说说你的想法..."
                    className="w-full px-4 py-3 rounded-[14px] bg-[#F5F5F7] dark:bg-white/[0.06] border border-transparent text-[14px] leading-6 text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#AEAEB2] focus:bg-white dark:focus:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 transition-all resize-none"
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
                    className="h-10 px-4 rounded-[13px] bg-[#F5F5F7] dark:bg-white/[0.06] text-[13px] font-medium text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-[#EDEDF0] dark:hover:bg-white/[0.1] disabled:opacity-50 transition-colors"
                  >
                    取消
                  </button>
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={SWIFTUI_BOUNCY}
                    className="h-10 px-5 rounded-[13px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-2 shadow-[0_6px_16px_rgba(0,113,227,0.25)] disabled:opacity-60"
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
