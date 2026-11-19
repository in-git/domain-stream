/**
 * 留言管理弹窗集合：新增/编辑、详情、审核回复、删除确认
 * 供 biz/message/index 使用，UI 风格与 CueStudio 工作台保持一致。
 */
import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  X,
} from 'lucide-react';
import {
  MESSAGE_STATUSES,
  messageApi,
  messageStatusLabel,
  toMessagePayload,
  type BizMessage,
  type MessagePayload,
  type MessageStatus,
} from '../../../lib/message.ts';
import { formatDateTime } from '../../../lib/format.ts';

const INPUT_CLASS =
  'w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-transparent text-[13px] text-[#1D1D1F] placeholder:text-[#AEAEB2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 focus:border-[#0071E3]/30 transition-all';
const LABEL_CLASS = 'block text-[12px] font-medium text-[#3A3A3C] mb-1.5';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败，请稍后重试';
}

export function MessageModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 'max-w-2xl',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${width} max-h-[90vh] flex flex-col bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_20px_60px_rgba(0,0,0,0.16)] overflow-hidden`}
      >
        <div className="px-6 py-4 border-b border-[#F2F2F7] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-[#1D1D1F] truncate">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12px] text-[#86868B]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[#F2F2F7] flex items-center justify-end gap-2 shrink-0 bg-[#FAFAFC]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="h-9 px-4 rounded-xl bg-white border border-[#E5E5EA] text-[13px] font-medium text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  busy,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`h-9 px-4 rounded-xl text-white text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-60 transition-colors ${
        danger ? 'bg-[#D70015] hover:bg-[#C20012]' : 'bg-[#0071E3] hover:bg-[#0077ED]'
      }`}
    >
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

function InlineError({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-[#FF3B30]/8 px-3 py-2 text-[12px] text-[#D70015]">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 新增 / 编辑                                                         */
/* ------------------------------------------------------------------ */

export function MessageFormDialog({
  item,
  onClose,
  onSubmit,
}: {
  item: BizMessage | null;
  onClose: () => void;
  onSubmit: (payload: MessagePayload) => Promise<void>;
}) {
  const isEdit = !!item;
  const [nickname, setNickname] = useState(item?.nickname || '');
  const [avatar, setAvatar] = useState(item?.avatar || '');
  const [email, setEmail] = useState(item?.email || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [content, setContent] = useState(item?.content || '');
  const [status, setStatus] = useState<string>(item?.status || 'PENDING');
  const [sortCode, setSortCode] = useState(String(item?.sortCode ?? 0));
  const [remark, setRemark] = useState(item?.remark || '');
  const [extJson, setExtJson] = useState(item?.extJson || '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    const trimmedNickname = nickname.trim();
    const trimmedContent = content.trim();
    if (!trimmedNickname) return setError('请填写留言人昵称');
    if (!trimmedContent) return setError('请填写留言内容');
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError('邮箱格式不正确');
    }
    const parsedSort = Number(sortCode);
    if (!Number.isFinite(parsedSort)) return setError('排序需为数字');
    if (extJson.trim()) {
      try {
        JSON.parse(extJson.trim());
      } catch {
        return setError('扩展信息需为合法 JSON 字符串');
      }
    }

    const payload: MessagePayload = {
      ...(item ? { id: item.id } : {}),
      nickname: trimmedNickname,
      avatar: avatar.trim(),
      email: email.trim(),
      phone: phone.trim(),
      content: trimmedContent,
      status,
      sortCode: Math.trunc(parsedSort),
      remark: remark.trim(),
      extJson: extJson.trim(),
    };
    setBusy(true);
    setError(null);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <MessageModal
      title={isEdit ? '编辑留言' : '新增留言'}
      subtitle="后台代录留言，审核状态可在列表中通过「审核回复」调整"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            取消
          </SecondaryButton>
          <PrimaryButton onClick={() => void handleSubmit()} busy={busy}>
            保存
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {error && <InlineError>{error}</InlineError>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="msg-nickname">
              留言人昵称 <span className="text-[#D70015]">*</span>
            </label>
            <input
              id="msg-nickname"
              className={INPUT_CLASS}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="如：访客小李"
              maxLength={100}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="msg-status">
              审核状态
            </label>
            <select
              id="msg-status"
              className={INPUT_CLASS}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {MESSAGE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="msg-email">
              邮箱
            </label>
            <input
              id="msg-email"
              type="email"
              className={INPUT_CLASS}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              maxLength={100}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="msg-phone">
              联系电话
            </label>
            <input
              id="msg-phone"
              className={INPUT_CLASS}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="选填"
              maxLength={30}
            />
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="msg-avatar">
            头像地址
          </label>
          <input
            id="msg-avatar"
            className={INPUT_CLASS}
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="图片 URL，选填"
            maxLength={500}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="msg-content">
            留言内容 <span className="text-[#D70015]">*</span>
          </label>
          <textarea
            id="msg-content"
            className={`${INPUT_CLASS} h-auto min-h-[100px] py-2.5 leading-relaxed resize-y`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请输入留言内容"
            maxLength={2000}
          />
          <div className="mt-1 text-right text-[11px] text-[#AEAEB2]">{content.length} / 2000</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="msg-sort">
              排序
            </label>
            <input
              id="msg-sort"
              type="number"
              className={INPUT_CLASS}
              value={sortCode}
              onChange={(e) => setSortCode(e.target.value)}
              placeholder="数字越小越靠前"
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="msg-remark">
              备注
            </label>
            <input
              id="msg-remark"
              className={INPUT_CLASS}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="msg-ext">
            扩展信息（JSON）
          </label>
          <textarea
            id="msg-ext"
            className={`${INPUT_CLASS} h-auto min-h-[60px] py-2 resize-y font-mono text-[12px]`}
            value={extJson}
            onChange={(e) => setExtJson(e.target.value)}
            placeholder='{"source":"contact"}'
          />
        </div>
      </div>
    </MessageModal>
  );
}

/* ------------------------------------------------------------------ */
/* 详情                                                               */
/* ------------------------------------------------------------------ */

export function MessageDetailDialog({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [item, setItem] = useState<BizMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    messageApi
      .detail(id)
      .then((data) => alive && setItem(data))
      .catch((err) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [id]);

  const rows: Array<{ label: string; value: ReactNode }> = item
    ? [
        { label: '留言人', value: item.nickname || '-' },
        { label: '邮箱', value: item.email || '-' },
        { label: '联系电话', value: item.phone || '-' },
        { label: '审核状态', value: messageStatusLabel(item.status) },
        { label: '留言内容', value: item.content || '-' },
        { label: '管理员回复', value: item.reply || '暂无回复' },
        {
          label: '回复时间',
          value: item.replyTime ? formatDateTime(item.replyTime) : '-',
        },
        { label: '回复人', value: item.replyUser || '-' },
        { label: 'IP', value: item.ip || '-' },
        { label: '浏览器 UA', value: item.userAgent || '-' },
        { label: '排序', value: item.sortCode ?? '-' },
        { label: '备注', value: item.remark || '-' },
        { label: '扩展信息', value: item.extJson || '-' },
        {
          label: '提交时间',
          value: item.createTime ? formatDateTime(item.createTime) : '-',
        },
        {
          label: '更新时间',
          value: item.updateTime ? formatDateTime(item.updateTime) : '-',
        },
      ]
    : [];

  return (
    <MessageModal
      title="留言详情"
      subtitle={`ID：${id}`}
      onClose={onClose}
      width="max-w-xl"
      footer={<SecondaryButton onClick={onClose}>关闭</SecondaryButton>}
    >
      {error ? (
        <InlineError>{error}</InlineError>
      ) : !item ? (
        <div className="py-10 flex items-center justify-center gap-2 text-[13px] text-[#86868B]">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在加载留言详情...
        </div>
      ) : (
        <dl className="divide-y divide-[#F2F2F7]">
          {rows.map((row) => (
            <div key={row.label} className="py-2.5 flex items-start gap-4 text-[13px]">
              <dt className="w-24 shrink-0 text-[#86868B]">{row.label}</dt>
              <dd className="flex-1 min-w-0 text-[#1D1D1F] break-words whitespace-pre-wrap">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </MessageModal>
  );
}

/* ------------------------------------------------------------------ */
/* 审核 / 回复                                                         */
/* ------------------------------------------------------------------ */

function localDateTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function MessageReplyDialog({
  item,
  onClose,
  onSubmit,
}: {
  item: BizMessage;
  onClose: () => void;
  onSubmit: (payload: MessagePayload) => Promise<void>;
}) {
  const [reply, setReply] = useState(item.reply || '');
  const [status, setStatus] = useState<MessageStatus>(
    (item.status as MessageStatus) || 'PENDING'
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!reply.trim()) return setError('请填写回复内容');
    const payload: MessagePayload = {
      ...toMessagePayload(item),
      reply: reply.trim(),
      replyTime: localDateTime(),
      replyUser: '',
      status,
    };
    setBusy(true);
    setError(null);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <MessageModal
      title="审核回复"
      subtitle={`${item.nickname || '匿名访客'} · ${item.createTime ? formatDateTime(item.createTime) : ''}`}
      onClose={onClose}
      width="max-w-xl"
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            取消
          </SecondaryButton>
          <PrimaryButton onClick={() => void handleSubmit()} busy={busy}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            提交审核
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {error && <InlineError>{error}</InlineError>}

        <div className="rounded-xl bg-[#F5F5F7] p-4">
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#86868B]">
            <MessageSquareText className="w-3.5 h-3.5" />
            留言内容
          </div>
          <p className="mt-2 text-[13px] text-[#1D1D1F] leading-6 whitespace-pre-wrap">
            {item.content || '-'}
          </p>
          {(item.email || item.phone) && (
            <p className="mt-2 text-[12px] text-[#86868B]">
              联系方式：{[item.email, item.phone].filter(Boolean).join(' / ')}
            </p>
          )}
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="msg-reply">
            回复内容 <span className="text-[#D70015]">*</span>
          </label>
          <textarea
            id="msg-reply"
            className={`${INPUT_CLASS} h-auto min-h-[100px] py-2.5 leading-relaxed resize-y`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="请输入回复内容"
            maxLength={2000}
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>审核结果</label>
          <div className="flex flex-wrap gap-2">
            {MESSAGE_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={`h-9 px-4 rounded-xl text-[13px] font-medium border transition-colors ${
                  status === s.value
                    ? 'bg-[#0071E3] text-white border-[#0071E3]'
                    : 'bg-white text-[#3A3A3C] border-[#E5E5EA] hover:bg-[#F5F5F7]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </MessageModal>
  );
}

/* ------------------------------------------------------------------ */
/* 删除确认                                                           */
/* ------------------------------------------------------------------ */

export function MessageDeleteDialog({
  items,
  onClose,
  onConfirm,
}: {
  items: BizMessage[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <MessageModal
      title="确认删除留言？"
      subtitle="删除后不可恢复"
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            取消
          </SecondaryButton>
          <PrimaryButton onClick={() => void handleConfirm()} busy={busy} danger>
            确认删除
          </PrimaryButton>
        </>
      }
    >
      {error && <InlineError>{error}</InlineError>}
      <p className="text-[13px] text-[#3A3A3C] leading-6">
        即将删除 <span className="font-semibold text-[#D70015]">{items.length}</span> 条留言：
      </p>
      <ul className="mt-3 rounded-xl bg-[#F5F5F7] p-3 space-y-1.5 max-h-40 overflow-y-auto">
        {items.slice(0, 10).map((m) => (
          <li key={m.id} className="text-[12px] text-[#3A3A3C] truncate">
            · {m.nickname || '匿名访客'}：{(m.content || '').slice(0, 40)}
          </li>
        ))}
        {items.length > 10 && (
          <li className="text-[12px] text-[#86868B]">…等共 {items.length} 条</li>
        )}
      </ul>
    </MessageModal>
  );
}
