import { AnimatePresence, motion } from 'motion/react';
import { Check, Heart, MessageCircle, Send, X } from 'lucide-react';
import type { MessageItem, MessageReply } from '../data/content.ts';
import type { ReplyDraft } from '../lib/api.ts';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { APPLE_EASE, SWIFTUI_BOUNCY, SWIFTUI_SMOOTH, SWIFTUI_SNAPPY } from '../lib/motion.ts';

type SortMode = 'latest' | 'hot';

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function Avatar({ name, src, size = 'md' }: { name: string; src?: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-[13px]';
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} rounded-full object-cover bg-[#F2F2F7] dark:bg-white/10 shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-[#F2F2F7] dark:bg-white/[0.08] flex items-center justify-center text-[#6E6E73] dark:text-[#D1D1D6] font-medium shrink-0`}
    >
      {(name || '访').slice(0, 1).toUpperCase()}
    </div>
  );
}

export interface MessageAuthor {
  name: string;
  userId?: string;
  email?: string;
  avatar?: string;
}

interface ReplyTarget {
  messageId: string;
  parentReplyId?: string;
  replyToNickname?: string;
}

export default function MessagesView({
  messages,
  replies,
  likedIds,
  searchQuery,
  isLoggedIn,
  currentUser,
  onRequireLogin,
  onToggleLike,
  onAddMessage,
  onAddReply,
}: {
  messages: MessageItem[];
  replies: MessageReply[];
  likedIds: Set<string>;
  searchQuery: string;
  isLoggedIn: boolean;
  currentUser: MessageAuthor;
  onRequireLogin: () => void;
  onToggleLike: (id: string) => void;
  onAddMessage: (message: MessageItem) => void | Promise<void>;
  onAddReply: (draft: ReplyDraft) => void | Promise<void>;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [content, setContent] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  /** 打开详情的留言 id，null 表示模态框关闭 */
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  /** 按留言 id 分组，组内按时间升序（后端已排好，本地乐观追加后再兜一次底） */
  const repliesByMessage = useMemo(() => {
    const map = new Map<string, MessageReply[]>();
    replies.forEach((item) => {
      const list = map.get(item.messageId) || [];
      list.push(item);
      map.set(item.messageId, list);
    });
    map.forEach((list) =>
      list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    );
    return map;
  }, [replies]);

  const visibleMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = messages.filter((m) => {
      if (!q) return true;
      const related = repliesByMessage.get(m.id) || [];
      return [m.nickname, m.content, ...related.map((r) => `${r.nickname} ${r.content}`)]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q));
    });
    return [...list].sort((a, b) =>
      sortMode === 'hot'
        ? b.likes - a.likes || b.createdAt.localeCompare(a.createdAt)
        : b.createdAt.localeCompare(a.createdAt)
    );
  }, [messages, searchQuery, sortMode, repliesByMessage]);

  const activeMessage = useMemo(
    () => messages.find((m) => m.id === activeMessageId) || null,
    [messages, activeMessageId]
  );

  /** 模态框内的回复弹幕 */
  const modalReplies = useMemo(
    () => (activeMessageId ? repliesByMessage.get(activeMessageId) || [] : []),
    [activeMessageId, repliesByMessage]
  );
  const modalTrackCount = Math.min(Math.max(modalReplies.length, 1), 4);
  const modalDanmaku =
    modalReplies.length > modalTrackCount
      ? [...modalReplies, ...modalReplies]
      : modalReplies;

  /** 模态框打开时锁定背景滚动，并支持 ESC 关闭 */
  useEffect(() => {
    if (!activeMessageId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveMessageId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeMessageId]);

  /** 回复成功后短暂提示 */
  useEffect(() => {
    if (!replySuccess) return;
    const timer = window.setTimeout(() => setReplySuccess(null), 2400);
    return () => window.clearTimeout(timer);
  }, [replySuccess]);

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
      userId: currentUser.userId,
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

  /** 打开留言详情模态框，底部带回复输入框 */
  function openMessage(messageId: string) {
    setActiveMessageId(messageId);
    setReplyError(null);
    setReplySuccess(null);
    setReplyText('');
    setReplyTarget({ messageId });
  }

  function closeMessage() {
    setActiveMessageId(null);
    setReplyTarget(null);
    setReplyText('');
    setReplyError(null);
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeMessageId || replySubmitting) return;
    const text = replyText.trim();
    if (!text) {
      setReplyError('请填写回复内容');
      return;
    }
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }

    setReplySubmitting(true);
    setReplyError(null);
    try {
      await onAddReply({
        messageId: activeMessageId,
        userId: currentUser.userId,
        content: text,
        parentReplyId: replyTarget?.parentReplyId,
        replyToNickname: replyTarget?.replyToNickname,
      });
      setReplyText('');
      setReplySuccess('回复已发布');
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : '回复失败，请稍后重试');
    } finally {
      setReplySubmitting(false);
    }
  }

  return (
    <section aria-labelledby="messages-heading" className="space-y-6">
      <div>
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
          <div className="columns-2 gap-3 sm:gap-4 xl:gap-5 md:columns-3 xl:columns-4 2xl:columns-5">
            {visibleMessages.map((message, index) => {
              const isLiked = likedIds.has(message.id);
              const messageReplies = repliesByMessage.get(message.id) || [];
              // 弹幕轨道：回复数超过轨道数时循环滚动
              const trackCount = Math.min(Math.max(messageReplies.length, 1), 4);
              const danmakuStream =
                messageReplies.length > trackCount
                  ? [...messageReplies, ...messageReplies]
                  : messageReplies;
              return (
                <motion.article
                  key={message.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SWIFTUI_SMOOTH, delay: Math.min(index, 8) * 0.03 }}
                  className="break-inside-avoid mb-3 sm:mb-4"
                >
                  <div className="group overflow-hidden rounded-2xl bg-white dark:bg-[#161618] border border-black/[0.05] dark:border-white/[0.07] transition-shadow hover:shadow-md">
                  {/* 语录区 + 弹幕层 */}
                  <div className="relative">
                  {/* 语录区：引号装饰 + 居中大字，点击打开详情 */}
                  <button
                    type="button"
                    onClick={() => openMessage(message.id)}
                    className="flex flex-col w-full px-4 pt-4 pb-4 min-h-[180px] sm:min-h-[210px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071E3]"
                    aria-label={`查看留言详情：${message.nickname}`}
                  >
                    <span
                      aria-hidden="true"
                      className="font-editorial text-[38px] leading-[0.45] text-[#4A7FD4]/85 dark:text-[#6E9BE8]/80 select-none"
                    >
                      &ldquo;
                    </span>

                    <div className="flex-1 flex items-center justify-center py-4">
                      <p className="text-center font-editorial text-[19px] sm:text-[23px] leading-[1.75] text-[#2C4C82] dark:text-[#8AB4F2] whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                  </button>

                  {/* 弹幕层：其他人的回复以弹幕形式飘过语录区 */}
                  {danmakuStream.length > 0 && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 overflow-hidden pointer-events-none"
                    >
                      {danmakuStream.map((danmaku, danmakuIndex) => {
                        const lane = danmakuIndex % trackCount;
                        return (
                          <span
                            key={`${danmaku.id}-${danmakuIndex}`}
                            className="absolute left-0 inline-flex items-center gap-1 max-w-[92%] rounded-md bg-black/55 dark:bg-black/70 backdrop-blur-[2px] px-1.5 py-0.5 text-[10px] sm:text-[11px] leading-tight text-white/95 shadow-sm animate-[danmaku_9s_linear_infinite] group-hover:[animation-play-state:paused]"
                            style={{
                              top: `${8 + lane * (82 / trackCount)}%`,
                              animationDelay: `${-(lane * (9 / trackCount))}s`,
                            }}
                          >
                            <span className="font-medium text-[#8FC0FF] shrink-0">
                              {danmaku.nickname}
                            </span>
                            <span className="truncate">{danmaku.content}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  </div>

                  {/* 弹幕内容对读屏软件不可见，额外提供一份纯文本回复列表 */}
                  {messageReplies.length > 0 && (
                    <ul className="sr-only">
                      {messageReplies.map((replyItem) => (
                        <li key={replyItem.id}>
                          {replyItem.nickname}
                          {replyItem.replyToNickname ? ` 回复 ${replyItem.replyToNickname}` : ''}：
                          {replyItem.content}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* 底部作者行：参考图的「作者 + 点赞」布局 */}
                  <div className="mt-1 px-3 py-2 border-t border-[#F2F2F7] dark:border-white/[0.06] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Avatar name={message.nickname} size="sm" />
                      <div className="min-w-0">
                        <div className="text-[11px] text-[#3A3A3C] dark:text-[#D1D1D6] truncate leading-tight">
                          {message.nickname}
                        </div>
                        <div className="text-[10px] text-[#AEAEB2] dark:text-[#86868B] tabular-nums leading-tight">
                          {formatDate(message.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openMessage(message.id)}
                        aria-label="查看留言详情与回复"
                        className="flex items-center gap-1 px-1 py-1 text-[11px] tabular-nums text-[#8E8E93] dark:text-[#98989D] hover:text-[#0071E3] dark:hover:text-[#0A84FF] transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.8} />
                        <span>{messageReplies.length}</span>
                      </button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        transition={SWIFTUI_BOUNCY}
                        onClick={() => onToggleLike(message.id)}
                        aria-label={isLiked ? '取消点赞' : '点赞'}
                        aria-pressed={isLiked}
                        className={`flex items-center gap-1 px-1 py-1 text-[11px] tabular-nums transition-colors ${
                          isLiked
                            ? 'text-[#FF2E4D]'
                            : 'text-[#8E8E93] dark:text-[#98989D] hover:text-[#FF2E4D]'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`}
                          strokeWidth={1.8}
                        />
                        <span>{message.likes}</span>
                      </motion.button>
                    </div>
                  </div>
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

      {/* 留言详情模态框：底部为留言输入框 */}
      <AnimatePresence>
        {activeMessage && (
          <motion.div
            key="message-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeMessage();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="留言详情"
              initial={{ opacity: 0, y: 32, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={SWIFTUI_SMOOTH}
              className="relative w-full sm:max-w-lg max-h-[88vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-black/[0.06] dark:border-white/10 bg-white dark:bg-[#1C1C1E] shadow-xl"
            >
              <button
                type="button"
                onClick={closeMessage}
                aria-label="关闭"
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-lg flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] dark:hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* 语录展示区 */}
              <div className="relative px-6 pt-7 pb-5 min-h-[240px] flex flex-col">
                <span
                  aria-hidden="true"
                  className="font-editorial text-[38px] leading-[0.45] text-[#4A7FD4]/85 dark:text-[#6E9BE8]/80 select-none"
                >
                  &ldquo;
                </span>

                <div className="flex-1 flex items-center justify-center py-4">
                  <p className="text-center font-editorial text-[21px] leading-[1.75] text-[#2C4C82] dark:text-[#8AB4F2] whitespace-pre-wrap break-words">
                    {activeMessage.content}
                  </p>
                </div>

                {/* 弹幕层 */}
                {modalDanmaku.length > 0 && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                  >
                    {modalDanmaku.map((danmaku, danmakuIndex) => {
                      const lane = danmakuIndex % modalTrackCount;
                      return (
                        <span
                          key={`${danmaku.id}-${danmakuIndex}`}
                          className="absolute left-0 inline-flex items-center gap-1 max-w-[92%] rounded-md bg-black/55 dark:bg-black/70 backdrop-blur-[2px] px-1.5 py-0.5 text-[10px] sm:text-[11px] leading-tight text-white/95 shadow-sm animate-[danmaku_9s_linear_infinite]"
                          style={{
                            top: `${8 + lane * (78 / modalTrackCount)}%`,
                            animationDelay: `${-(lane * (9 / modalTrackCount))}s`,
                          }}
                        >
                          <span className="font-medium text-[#8FC0FF] shrink-0">
                            {danmaku.nickname}
                          </span>
                          <span className="truncate">{danmaku.content}</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* 作者行 */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={activeMessage.nickname} size="sm" />
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        {activeMessage.nickname}
                      </div>
                      <div className="text-[10px] text-[#AEAEB2] tabular-nums">
                        {formatDate(activeMessage.createdAt)}
                      </div>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    transition={SWIFTUI_BOUNCY}
                    onClick={() => onToggleLike(activeMessage.id)}
                    aria-label={likedIds.has(activeMessage.id) ? '取消点赞' : '点赞'}
                    aria-pressed={likedIds.has(activeMessage.id)}
                    className={`flex items-center gap-1 px-1 py-1 text-[12px] tabular-nums transition-colors ${
                      likedIds.has(activeMessage.id)
                        ? 'text-[#FF2E4D]'
                        : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#FF2E4D]'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${likedIds.has(activeMessage.id) ? 'fill-current' : ''}`}
                      strokeWidth={1.8}
                    />
                    <span>{activeMessage.likes}</span>
                  </motion.button>
                </div>
              </div>

              {/* 底部留言输入框 */}
              <form
                onSubmit={(event) => void submitReply(event)}
                className="border-t border-[#F2F2F7] dark:border-white/[0.06] bg-[#F5F5F7] dark:bg-white/[0.03] p-3"
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0 rounded-xl bg-white dark:bg-white/[0.07] border border-transparent focus-within:ring-2 focus-within:ring-[#0071E3]/25 transition-all">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder={isLoggedIn ? '写下你的留言...' : '登录后可留言'}
                      disabled={!isLoggedIn}
                      onFocus={() => {
                        if (!isLoggedIn) onRequireLogin();
                      }}
                      className="w-full px-3 py-2 bg-transparent rounded-xl text-[13px] leading-5 text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#AEAEB2] focus:outline-none resize-none disabled:opacity-60"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={replySubmitting || !replyText.trim() || !isLoggedIn}
                    whileTap={{ scale: 0.96 }}
                    transition={SWIFTUI_SNAPPY}
                    className="h-10 px-4 shrink-0 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" strokeWidth={2} />
                    {replySubmitting ? '发送中' : '发送'}
                  </motion.button>
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-2 min-h-[16px]">
                  <span className="text-[11px] text-[#AEAEB2] tabular-nums">
                    {replyText.length} / 500
                  </span>
                  {replyError && (
                    <span className="text-[11px] text-[#D70015] truncate">{replyError}</span>
                  )}
                  <AnimatePresence>
                    {replySuccess && (
                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#16A34A]"
                      >
                        <Check className="w-3 h-3" />
                        {replySuccess}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
