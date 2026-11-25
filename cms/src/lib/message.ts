/**
 * 留言管理（BIZ_MESSAGE）接口对接层
 * ------------------------------------------------------------------
 * 后端：vip.xiaonuo.biz.modular.message.controller.BizMessageController
 * 路由：/biz/message/*（GET page / detail，POST add / edit / delete）
 * 前端统一经 /snowy 代理访问，与登录态 token 保持一致。
 *
 * 说明：搜索 / 状态筛选 / 排序均通过 page 接口在服务端完成。
 */
import { snowyRequest } from './snowy.ts';

const BASE = '/biz/message';

/** 审核状态枚举：与 BIZ_MESSAGE.STATUS 字段注释一致 */
export const MESSAGE_STATUSES = [
  { value: 'APPROVED', label: '已通过' },
  { value: 'PENDING', label: '待审核' },
  { value: 'REJECTED', label: '已拒绝' },
] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number]['value'];

/** 留言列表服务端查询条件（分页拉取时逐页透传） */
export interface MessagePageQuery {
  searchKey?: string;
  status?: string;
  sortField?: string;
  sortOrder?: string;
}

export function messageStatusLabel(value?: string): string {
  return MESSAGE_STATUSES.find((s) => s.value === value)?.label || value || '-';
}

/** 状态对应的 Tailwind 配色（完整类名，便于静态提取） */
export function messageStatusClass(value?: string): string {
  if (value === 'APPROVED') return 'bg-[#16A34A]/10 text-[#16A34A]';
  if (value === 'REJECTED') return 'bg-[#D70015]/10 text-[#D70015]';
  return 'bg-[#D97706]/10 text-[#D97706]';
}

/** BIZ_MESSAGE 实体（后端字段为驼峰） */
export interface BizMessage {
  id: string;
  /** 父留言ID：顶级留言为空；访客回复指向被回复的留言或回复（单表递归） */
  parentId?: string;
  /** 被回复者昵称，用于展示「回复 @xxx」 */
  replyToNickname?: string;
  /** 由 USER_ID 反查的展示昵称，不落库 */
  nickname?: string;
  userId?: string;
  content?: string;
  status?: string;
  ip?: string;
  userAgent?: string;
  deleteFlag?: string;
  createTime?: string;
  createUser?: string;
  updateTime?: string;
  updateUser?: string;
}

/** add / edit 允许提交的业务字段（不含审计字段） */
export interface MessagePayload {
  id?: string;
  userId?: string;
  content?: string;
  status?: string;
  ip?: string;
  userAgent?: string;
}

/** MyBatis-Plus 分页对象 */
export interface MessagePage {
  records: BizMessage[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

function qs(params: Record<string, unknown> = {}): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (!entries.length) return '';
  return (
    '?' +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
  );
}

/** 留言动作权限码，兼容 Snowy 按钮码与 SaCheckPermission 的路径码两种写法 */
export type MessagePermAction = 'page' | 'detail' | 'add' | 'edit' | 'delete';

const PERM_CODES: Record<MessagePermAction, string[]> = {
  page: ['bizMessagePage', '/biz/message/page'],
  detail: ['bizMessageDetail', '/biz/message/detail'],
  add: ['bizMessageAdd', '/biz/message/add'],
  edit: ['bizMessageEdit', '/biz/message/edit'],
  delete: ['bizMessageDelete', 'bizMessageBatchDelete', '/biz/message/delete'],
};

/**
 * 菜单可见即代表有该模块的访问权限；权限列表为空（超管/未下发按钮码）时
 * 不隐藏按钮，由后端 @SaCheckPermission 兜底。
 */
export function hasMessagePerm(
  permissions: string[] | undefined | null,
  action: MessagePermAction
): boolean {
  if (!permissions || permissions.length === 0) return true;
  const codes = PERM_CODES[action];
  return permissions.some((c) => c === '*' || codes.includes(c));
}

/** 实体 -> 完整编辑参数（后端 edit 会整体复制，不能只传改动字段） */
export function toMessagePayload(item: BizMessage): MessagePayload {
  return {
    id: item.id,
    userId: item.userId || '',
    content: item.content || '',
    status: item.status || 'APPROVED',
    ip: item.ip || '',
    userAgent: item.userAgent || '',
  };
}

export const messageApi = {
  /** 分页 */
  page(params: {
    current?: number;
    size?: number;
    sortField?: string;
    sortOrder?: string;
    searchKey?: string;
    status?: string;
  } = {}): Promise<MessagePage> {
    // Snowy 后端排序校验按小写枚举值比较
    const sortOrder = params.sortOrder?.toLowerCase();
    return snowyRequest<MessagePage>(`${BASE}/page${qs({ ...params, sortOrder })}`);
  },

  /** 详情 */
  detail(id: string): Promise<BizMessage> {
    return snowyRequest<BizMessage>(`${BASE}/detail${qs({ id })}`);
  },

  /** 新增 */
  add(payload: MessagePayload): Promise<string> {
    return snowyRequest<string>(`${BASE}/add`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** 编辑（payload 必须带 id） */
  edit(payload: MessagePayload): Promise<string> {
    return snowyRequest<string>(`${BASE}/edit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** 删除：后端要求 [{"id":"..."}] 数组，支持批量 */
  remove(ids: string[]): Promise<string> {
    return snowyRequest<string>(`${BASE}/delete`, {
      method: 'POST',
      body: JSON.stringify(ids.map((id) => ({ id }))),
    });
  },
};

/** 按服务端条件循环分页拉取留言，默认每页 20 条 */
export async function listAllMessages(query: MessagePageQuery = {}): Promise<BizMessage[]> {
  const all: BizMessage[] = [];
  const size = 20;
  for (let current = 1; ; current++) {
    const page = await messageApi.page({ current, size, ...query });
    const records = page?.records || [];
    if (!records.length) break;
    const known = new Set(all.map((item) => item.id));
    const fresh = records.filter((item) => !known.has(item.id));
    if (!fresh.length) break;
    all.push(...fresh);
    const total = page?.total ?? all.length;
    if (all.length >= total) break;
  }
  return all;
}
