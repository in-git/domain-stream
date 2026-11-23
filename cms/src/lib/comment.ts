/**
 * 评论管理接口层（BIZ_COMMENT）
 * 后端：/biz/comment/*
 */
import { snowyRequest } from './snowy.ts';

const BASE = '/biz/comment';

export interface BizComment {
  id: string;
  targetType?: string;
  targetId?: string;
  targetTitle?: string;
  userId?: string;
  nickname?: string;
  content?: string;
  rootId?: string;
  parentId?: string;
  path?: string;
  replyToNickname?: string;
  status?: string;
  isOfficial?: string;
  likeCount?: number;
  ip?: string;
  userAgent?: string;
  createTime?: string;
}

export interface CommentPage {
  records: BizComment[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export const COMMENT_TARGET_LABELS: Record<string, string> = {
  ARTICLE: '文章',
  VIDEO: '视频',
  IMAGE_TEXT: '图文',
};

export const COMMENT_STATUS_LABELS: Record<string, string> = {
  APPROVED: '已通过',
  PENDING: '待审核',
  REJECTED: '已拒绝',
};

export type CommentPermAction = 'page' | 'detail' | 'audit' | 'delete';

const PERM_CODES: Record<CommentPermAction, string[]> = {
  page: ['bizCommentPage', '/biz/comment/page'],
  detail: ['bizCommentDetail', '/biz/comment/detail'],
  audit: ['bizCommentAudit', '/biz/comment/audit'],
  delete: ['bizCommentDelete', '/biz/comment/delete'],
};

export function hasCommentPerm(
  permissions: string[] | undefined | null,
  action: CommentPermAction
): boolean {
  if (!permissions || permissions.length === 0) return true;
  return permissions.some((code) => code === '*' || PERM_CODES[action].includes(code));
}

function qs(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (!entries.length) return '';
  return `?${entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')}`;
}

export const commentApi = {
  page: (params: {
    current?: number;
    size?: number;
    targetType?: string;
    targetId?: string;
    status?: string;
    searchKey?: string;
  }) => snowyRequest<CommentPage>(`${BASE}/page${qs(params)}`),

  detail: (id: string) => snowyRequest<BizComment>(`${BASE}/detail${qs({ id })}`),

  audit: (ids: string[], status: string) =>
    snowyRequest<string>(`${BASE}/audit`, {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    }),

  delete: (ids: string[]) =>
    snowyRequest<string>(`${BASE}/delete`, {
      method: 'POST',
      body: JSON.stringify(ids.map((id) => ({ id }))),
    }),
};
