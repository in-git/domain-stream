import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MessageCircle, Send, Trash2, X } from 'lucide-react';
import { commentApi, type PortalComment } from '../lib/api.ts';
import { requireCommentLogin } from '../lib/commentLogin.ts';
import { useCommentEnabled } from '../lib/systemInfo.ts';
import { getCachedClientUser, getSnowyToken, type SnowyClientUser } from '../lib/snowyAuth.ts';

interface CommentPanelProps {
  open: boolean;
  targetType: 'ARTICLE' | 'VIDEO' | 'IMAGE_TEXT';
  targetId: string;
  onClose: () => void;
  /** 嵌入模式：用于 PC 端文章/图文右侧栏，不再显示遮罩弹窗 */
  embedded?: boolean;
  /** 侧边抽屉模式：视频评论使用，与播放列表侧边栏一致的形态 */
  drawer?: boolean;
  /** 底部半屏弹层：移动端图文评论使用 */
  sheet?: boolean;
}

interface ReplyTarget {
  id: string;
  nickname: string;
}

function commentTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function displayName(user: SnowyClientUser | null): string {
  if (!user) return '';
  return user.nickname || user.name || user.account || user.email || '';
}

/** 内容评论区：扁平数据按 parentId 组装无限层级，支持逐层回复与自删。 */
export function CommentPanel({
  open,
  targetType,
  targetId,
  onClose,
  embedded = false,
  drawer = false,
  sheet = false,
}: CommentPanelProps) {
  const commentsEnabled = useCommentEnabled();
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(() => getCachedClientUser()?.id || '');
  const [userName, setUserName] = useState(() => displayName(getCachedClientUser()));

  const load = useCallback(async () => {
    if (!commentsEnabled || !open || !targetId) return;
    setLoading(true);
    setError('');
    try {
      const rows = await commentApi.list(targetType, targetId);
      setComments(rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '评论加载失败');
    } finally {
      setLoading(false);
    }
  }, [commentsEnabled, open, targetType, targetId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const user = getCachedClientUser();
    setCurrentUserId(user?.id || '');
    setUserName(displayName(user));
    setReplyTo(null);
    setContent('');
  }, [open, targetId]);

  const grouped = useMemo(() => {
    const map = new Map<string, PortalComment[]>();
    for (const comment of comments) {
      const key = comment.parentId || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(comment);
    }
    map.forEach((list) =>
      list.sort((a, b) => (a.createTime || '').localeCompare(b.createTime || ''))
    );
    return map;
  }, [comments]);

  // 视频评论区用暗色贴合播放器；文章和图文评论区用亮色贴合内容页。
  const dark = targetType === 'VIDEO';
  const tone = {
    panel: dark ? 'bg-[#111114] text-white' : 'bg-white text-[#1D1D1F]',
    panelRing: dark ? 'ring-white/10' : 'ring-black/[0.06]',
    headerBorder: dark ? 'border-white/10' : 'border-black/[0.06]',
    footerBorder: dark ? 'border-white/10' : 'border-black/[0.06]',
    footerBg: dark ? 'bg-black/30' : 'bg-[#F5F5F7]',
    muted: dark ? 'text-white/45' : 'text-[#8E8E93]',
    soft: dark ? 'text-white/55' : 'text-[#6E6E73]',
    name: dark ? 'text-white/90' : 'text-[#1D1D1F]',
    body: dark ? 'text-white/90' : 'text-[#3A3A3C]',
    childBorder: dark ? 'border-white/10' : 'border-black/[0.06]',
    close: dark
      ? 'text-white/60 hover:bg-white/10 hover:text-white'
      : 'text-[#8E8E93] hover:bg-black/[0.05] hover:text-[#1D1D1F]',
    action: dark ? 'hover:text-white' : 'hover:text-[#0071E3]',
    textarea: dark
      ? 'border-white/10 bg-white/5 text-white placeholder:text-white/35 focus:border-[#0071E3]'
      : 'border-[#D2D2D7] bg-white text-[#1D1D1F] placeholder:text-[#A1A1A6] focus:border-[#0071E3]',
    overlay: dark ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/35 backdrop-blur-sm',
  };

  async function submit() {
    if (!commentsEnabled) return;
    const text = content.trim();
    if (!text) {
      setError('请输入评论内容');
      return;
    }
    if (!getSnowyToken()) {
      requireCommentLogin();
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await commentApi.add({
        targetType,
        targetId,
        content: text,
        parentId: replyTo?.id,
        replyToNickname: replyTo?.nickname,
      });
      setContent('');
      setReplyTo(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '评论发表失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeComment(id: string) {
    if (!getSnowyToken()) {
      requireCommentLogin();
      return;
    }
    try {
      await commentApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  }

  const renderNode = (comment: PortalComment, depth: number): ReactNode => {
    const children = grouped.get(comment.id) || [];
    const mine = !!currentUserId && currentUserId === comment.userId;
    return (
      <div
        key={comment.id}
        className={depth > 0 ? `ml-4 border-l pl-3 sm:ml-6 ${tone.childBorder}` : ''}
      >
        <div className="py-3">
          <div className={`flex items-center gap-2 text-[12px] ${tone.soft}`}>
            <span className={`font-medium ${tone.name}`}>{comment.nickname || '用户'}</span>
            {comment.isOfficial === 'YES' && (
              <span className="rounded-full bg-[#0071E3]/20 px-1.5 py-0.5 text-[10px] text-[#337BC8] dark:text-[#7DB7FF]">
                官方
              </span>
            )}
            <span>{commentTime(comment.createTime)}</span>
          </div>
          <p className={`mt-1.5 text-[13px] leading-6 ${tone.body}`}>
            {comment.replyToNickname && (
              <span className="text-[#0071E3] dark:text-[#7DB7FF]">回复 @{comment.replyToNickname}：</span>
            )}
            {comment.content}
          </p>
          <div className={`mt-1.5 flex items-center gap-3 text-[11px] ${tone.muted}`}>
            <button
              type="button"
              onClick={() => {
                if (!getSnowyToken()) {
                  requireCommentLogin();
                  return;
                }
                setReplyTo({ id: comment.id, nickname: comment.nickname || '用户' });
              }}
              className={tone.action}
            >
              回复
            </button>
            {mine && (
              <button
                type="button"
                onClick={() => void removeComment(comment.id)}
                className="inline-flex items-center gap-1 text-[#D70015] hover:text-[#FF3B30] dark:text-[#FF6B6B]"
              >
                <Trash2 className="h-3 w-3" />
                删除
              </button>
            )}
          </div>
        </div>
        {children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (!commentsEnabled || !open) return null;

  const panel = (
    <div
      className={`flex min-h-0 flex-col overflow-hidden ${tone.panel} ${
        embedded || drawer
          ? 'h-full w-full'
          : sheet
            ? 'h-[50dvh] w-full rounded-t-3xl shadow-2xl ring-1'
            : 'h-[82vh] w-full max-w-2xl rounded-t-3xl shadow-2xl ring-1 sm:h-[min(86vh,820px)] sm:rounded-3xl'
      } ${embedded || drawer ? '' : tone.panelRing}`}
    >
      {sheet && (
        <div className="flex h-4 shrink-0 items-center justify-center" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-current opacity-25" />
        </div>
      )}
      <div className={`flex h-14 shrink-0 items-center justify-between border-b px-5 ${tone.headerBorder}`}>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#0071E3]" />
          <h3 className="text-[15px] font-semibold">评论</h3>
          <span className={`text-[12px] ${tone.muted}`}>{comments.length}</span>
        </div>
        {!embedded && (
          <button
            type="button"
            onClick={onClose}
            aria-label="收起评论"
            className={`rounded-full p-1.5 ${tone.close}`}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        {loading ? (
          <div className={`flex h-40 items-center justify-center text-[13px] ${tone.muted}`}>
            评论加载中…
          </div>
        ) : comments.length === 0 ? (
          <div className={`flex h-40 flex-col items-center justify-center gap-2 ${tone.muted}`}>
            <MessageCircle className="h-7 w-7" />
            <span className="text-[13px]">还没有评论，来说第一句吧</span>
          </div>
        ) : (
          (grouped.get('') || []).map((comment) => renderNode(comment, 0))
        )}
      </div>

      <div className={`shrink-0 border-t px-4 py-3 ${tone.footerBorder} ${tone.footerBg}`}>
        {error && <p className="mb-2 text-[12px] text-[#D70015] dark:text-[#FF6B6B]">{error}</p>}
        {replyTo && (
          <div className={`mb-2 flex items-center gap-2 text-[11px] ${tone.soft}`}>
            正在回复 @{replyTo.nickname}
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-[#0071E3] dark:text-[#7DB7FF]"
            >
              取消
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={content}
            maxLength={500}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit();
            }}
            placeholder={getSnowyToken() ? (userName ? `以 ${userName} 的身份评论…` : '写下你的评论…') : '登录后参与评论'}
            className={`h-11 flex-1 rounded-full border px-4 text-[13px] outline-none ${tone.textarea}`}
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            aria-label="发表评论"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0071E3] text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (embedded) return panel;

  if (drawer) {
    return (
      <aside className="absolute inset-y-0 right-0 z-40 flex w-[320px] max-w-[85vw] flex-col border-l border-white/15 bg-[#1C1C1E]/95 shadow-[-12px_0_32px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent"
          aria-hidden="true"
        />
        {panel}
      </aside>
    );
  }

  if (sheet) {
    return (
      <div
        className={`fixed inset-0 z-[80] flex items-end justify-center sm:hidden ${tone.overlay}`}
        onClick={onClose}
      >
        <div
          className="animate-comment-sheet-up w-full"
          onClick={(event) => event.stopPropagation()}
        >
          {panel}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6 ${tone.overlay}`}
      onClick={onClose}
    >
      <div onClick={(event) => event.stopPropagation()}>{panel}</div>
    </div>
  );
}
