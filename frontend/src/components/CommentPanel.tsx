import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Copy, MessageCircle, Send, Trash2, X } from 'lucide-react';
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
  /** PC 侧边抽屉模式：视频评论使用，与播放列表侧边栏一致；移动端自动改为底部弹层 */
  drawer?: boolean;
  /** 是否把弹层渲染到 document.body 顶层。视频沉浸流需开启，避免被 Swiper slide 的低层级父容器及标题浮层遮挡 */
  portalToBody?: boolean;
}

interface ReplyTarget {
  id: string;
  nickname: string;
  /** 被回复评论的内容，用于输入框提示文本 */
  content: string;
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
  // 评论对外只展示昵称，绝不回退到姓名、账号或邮箱
  return user.nickname || user.name || '';
}

/** 把正文里的 @提及渲染成蓝色，其余文字保持原色（抖音风格） */
function renderMentions(content: string): ReactNode {
  const parts = content.split(/(@[^\s@]+)/g);
  return parts.map((part, index) =>
    part.startsWith('@') ? (
      <span key={index} className="text-[#0071E3] dark:text-[#7DB7FF]">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** 内容评论区：按抖音式扁平列表展示，回复通过正文开头的 @ 指明对象。 */
export function CommentPanel({
  open,
  targetType,
  targetId,
  onClose,
  embedded = false,
  drawer = false,
  portalToBody = false,
}: CommentPanelProps) {
  const commentsEnabled = useCommentEnabled();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  );
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(() => getCachedClientUser()?.id || '');
  const [userName, setUserName] = useState(() => displayName(getCachedClientUser()));
  /** 长按弹出的操作菜单：记录目标评论与点击位置 */
  const [actionMenu, setActionMenu] = useState<{
    comment: PortalComment;
    x: number;
    y: number;
  } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const longPressPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

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
    setActionMenu(null);
    setContent('');
  }, [open, targetId]);

  const orderedComments = [...comments].sort((a, b) => {
    const timeDiff = (a.createTime || '').localeCompare(b.createTime || '');
    return timeDiff || a.id.localeCompare(b.id);
  });

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
    // 抖音风格：评论者昵称为灰色、不突出；蓝色只用于 @提及
    name: dark ? 'text-white/60' : 'text-[#6E6E73]',
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
      setActionMenu(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  }

  function clearLongPress() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function startReply(comment: PortalComment) {
    if (!getSnowyToken()) {
      requireCommentLogin();
      return;
    }
    const nickname = comment.nickname || '用户';
    setReplyTo({ id: comment.id, nickname, content: comment.content || '' });
    setContent((previous) => {
      const withoutMention = previous.replace(/^@\S+\s*/, '');
      return `@${nickname} ${withoutMention}`.slice(0, 500);
    });
  }

  async function copyComment(comment: PortalComment) {
    const text = comment.content || '';
    try {
      await navigator.clipboard.writeText(text);
      setError('');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {
        setError('复制失败');
      }
      document.body.removeChild(textarea);
    }
    setActionMenu(null);
  }

  function onCommentPointerDown(comment: PortalComment, event: ReactPointerEvent<HTMLDivElement>) {
    longPressFired.current = false;
    longPressPoint.current = { x: event.clientX, y: event.clientY };
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setActionMenu({ comment, x: event.clientX, y: event.clientY });
    }, 500);
  }

  function onCommentPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = longPressPoint.current;
    if (!start) return;
    if (Math.abs(event.clientX - start.x) > 10 || Math.abs(event.clientY - start.y) > 10) {
      clearLongPress();
    }
  }

  function onCommentClick(comment: PortalComment) {
    // 长按触发后不再执行点击回复
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    const mine = !!currentUserId && currentUserId === comment.userId;
    // 点击别人的评论即可回复；自己的评论不触发回复
    if (!mine) startReply(comment);
  }

  useEffect(() => () => clearLongPress(), []);

  const renderComment = (comment: PortalComment): ReactNode => {
    const mine = !!currentUserId && currentUserId === comment.userId;
    const hasInlineMention = comment.content.trimStart().startsWith('@');
    // 移动端：长按复制/删除、点击别人评论回复；PC 端保留逐条按钮，不启用长按
    const pressHandlers = isMobile
      ? {
          onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) =>
            onCommentPointerDown(comment, event),
          onPointerMove: onCommentPointerMove,
          onPointerUp: clearLongPress,
          onPointerCancel: clearLongPress,
          onPointerLeave: clearLongPress,
          onClick: () => onCommentClick(comment),
        }
      : {};
    return (
      <div
        key={comment.id}
        {...pressHandlers}
        className={`border-b py-3 last:border-b-0 ${tone.childBorder} ${
          isMobile && !mine ? 'cursor-pointer' : ''
        }`}
      >
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
          {!hasInlineMention && comment.replyToNickname && (
            <span className="text-[#0071E3] dark:text-[#7DB7FF]">回复 @{comment.replyToNickname}：</span>
          )}
          {renderMentions(comment.content)}
        </p>
        {!isMobile && (
          <div className={`mt-1.5 flex items-center gap-3 text-[11px] ${tone.muted}`}>
            <button type="button" onClick={() => startReply(comment)} className={tone.action}>
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
        )}
      </div>
    );
  };

  if (!commentsEnabled || !open) return null;

  const isSheet = isMobile;

  const panel = (
    <div
      className={`flex min-h-0 flex-col overflow-hidden ${tone.panel} ${
        embedded || (drawer && !isMobile)
          ? 'h-full w-full'
          : isSheet
            ? 'h-[66dvh] w-full rounded-t-3xl shadow-2xl ring-1'
            : 'h-[82vh] w-full max-w-2xl rounded-t-3xl shadow-2xl ring-1 sm:h-[min(86vh,820px)] sm:rounded-3xl'
      } ${embedded || (drawer && !isMobile) ? '' : tone.panelRing}`}
    >
      {isSheet && (
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
          orderedComments.map(renderComment)
        )}
      </div>

      <div className={`shrink-0 border-t px-4 py-3 ${tone.footerBorder} ${tone.footerBg}`}>
        {error && <p className="mb-2 text-[12px] text-[#D70015] dark:text-[#FF6B6B]">{error}</p>}
        {replyTo && (
          <div className={`mb-2 flex items-center gap-2 text-[11px] ${tone.soft}`}>
            正在回复 @{replyTo.nickname}
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setContent((previous) => previous.replace(/^@\S+\s*/, ''));
              }}
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
            placeholder={
              !getSnowyToken()
                ? '登录后参与评论'
                : replyTo
                  ? `回复：${replyTo.content.length > 60 ? `${replyTo.content.slice(0, 60)}…` : replyTo.content}`
                  : userName
                    ? `以 ${userName} 的身份评论…`
                    : '写下你的评论…'
            }
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

  // 长按操作菜单：复制 + （自己的评论）删除，挂到 body 顶层避免被任何父级遮挡
  // 长按菜单统一挂到 body 顶层，避免嵌在侧栏/动效容器内时被 transform 或层级遮挡
  const actionMenuNode =
    isMobile && actionMenu && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[120]"
            onPointerDown={(event) => {
              event.stopPropagation();
              clearLongPress();
              setActionMenu(null);
            }}
          >
            <div
              className="absolute w-36 overflow-hidden rounded-xl border border-white/10 bg-[#2C2C2E]/98 p-1 shadow-2xl backdrop-blur-xl"
              style={{
                left: Math.min(actionMenu.x, window.innerWidth - 152),
                top: Math.min(actionMenu.y, window.innerHeight - 96),
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => void copyComment(actionMenu.comment)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-white hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                复制
              </button>
              {currentUserId && currentUserId === actionMenu.comment.userId && (
                <button
                  type="button"
                  onClick={() => void removeComment(actionMenu.comment.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-[#FF6B6B] hover:bg-white/10"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  if (embedded) {
    return (
      <>
        {panel}
        {actionMenuNode}
      </>
    );
  }

  // 视频沉浸流中 Swiper slide 带 transform，会创建低层级 stacking context 劫持 fixed，
  // 因此弹层需挂到 body 顶层才能盖过同样 portal 到 body 的标题/操作浮层。
  const inPortal = portalToBody && typeof document !== 'undefined';
  const withPortal = (node: ReactNode) => (inPortal ? createPortal(node, document.body) : node);

  if (drawer && !isMobile) {
    return withPortal(
      <>
        <aside
          className={`${
            inPortal ? 'fixed' : 'absolute'
          } inset-y-0 right-0 z-[80] flex w-[320px] max-w-[85vw] flex-col border-l border-white/15 bg-[#1C1C1E]/95 shadow-[-12px_0_32px_rgba(0,0,0,0.55)] backdrop-blur-xl`}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent"
            aria-hidden="true"
          />
          {panel}
        </aside>
        {actionMenuNode}
      </>,
    );
  }

  if (isSheet) {
    return withPortal(
      <>
        <div
          className={`fixed inset-0 z-[90] flex items-end justify-center ${tone.overlay}`}
          onClick={onClose}
        >
          <div
            className="animate-comment-sheet-up w-full"
            onClick={(event) => event.stopPropagation()}
          >
            {panel}
          </div>
        </div>
        {actionMenuNode}
      </>,
    );
  }

  return withPortal(
    <>
      <div
        className={`fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6 ${tone.overlay}`}
        onClick={onClose}
      >
        <div onClick={(event) => event.stopPropagation()}>{panel}</div>
      </div>
      {actionMenuNode}
    </>,
  );
}
