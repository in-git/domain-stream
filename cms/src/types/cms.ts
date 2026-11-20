export type ModuleKey =
  | 'dashboard'
  | 'videos'
  | 'imagetexts'
  | 'articles'
  | 'category'
  | 'messages'
  | 'files'
  | 'materials'
  | 'config'
  | 'profile';

export type ContentStatus = 'published' | 'draft';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  roleTitle: string;
  department: string;
  avatarUrl: string;
  bio: string;
  defaultModule: ModuleKey;
  liveRefresh: boolean;
  lastLoginAt: string;
  // 以下为 Snowy 真实用户信息映射字段（可选，兼容旧调用）
  account?: string;
  nickname?: string;
  orgName?: string;
  positionName?: string;
  buttonCodeList?: string[];
  roleCodeList?: string[];
  permissionCodeList?: string[];
}

export interface LoginActivity {
  id: string;
  userId: string;
  device: string;
  location: string;
  ip: string;
  timestamp: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  category: string;
  videoUrl: string;
  coverUrl: string;
  durationSec: number;
  resolution: string;
  fileSizeBytes: number;
  views: number;
  completionRate: number;
  status: ContentStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  // 以下为小诺 biz 后端扩展字段（可选，不影响原有组件）
  tags?: string;
  likes?: number;
  comments?: number;
  publishTime?: string;
  isTop?: string;
  isRecommend?: string;
  sortCode?: number;
  remark?: string;
}

export interface ImageTextItem {
  id: string;
  title: string;
  body: string;
  category: string;
  images: string[];
  views: number;
  likes: number;
  status: ContentStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  // 以下为小诺 biz 后端扩展字段（可选）
  coverUrl?: string;
  description?: string;
  tags?: string;
  comments?: number;
  publishTime?: string;
  isTop?: string;
  isRecommend?: string;
  sortCode?: number;
  remark?: string;
  source?: string;
}

export interface ArticleItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  coverUrl: string;
  wordCount: number;
  readTimeMin: number;
  views: number;
  avgReadRate: number;
  status: ContentStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  // 以下为小诺 biz 后端扩展字段（可选）
  tags?: string;
  source?: string;
  likes?: number;
  comments?: number;
  publishTime?: string;
  isTop?: string;
  isRecommend?: string;
  sortCode?: number;
  remark?: string;
}

export interface TrafficPoint {
  label: string;
  uv: number;
  pv: number;
  avgStaySec: number;
}

export interface TrafficSource {
  name: string;
  visits: number;
  percentage: number;
}

export interface VisitorSnapshot {
  onlineNow: number;
  todayPV: number;
  todayUV: number;
  pvGrowthPercent: number;
  uvGrowthPercent: number;
  avgDurationSec: number;
  engagementRate: number;
  mobileSharePercent: number;
  desktopSharePercent: number;
  updatedAt: string;
}

export interface DashboardPayload {
  snapshot: VisitorSnapshot;
  series: {
    realtime: TrafficPoint[];
    week: TrafficPoint[];
    month: TrafficPoint[];
  };
  moduleStats: {
    videos: { count: number; published: number; totalViews: number };
    imagetexts: { count: number; published: number; totalViews: number };
    articles: { count: number; published: number; totalViews: number };
  };
  sources: TrafficSource[];
  topContent: Array<{
    id: string;
    type: 'video' | 'imagetext' | 'article';
    title: string;
    views: number;
    metricLabel: string;
    updatedAt: string;
  }>;
}
