export type ModuleKey = 'dashboard' | 'videos' | 'imagetexts' | 'articles' | 'profile';

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
}

export interface ImageTextItem {
  id: string;
  title: string;
  body: string;
  category: string;
  location: string;
  images: string[];
  views: number;
  likes: number;
  status: ContentStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
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
