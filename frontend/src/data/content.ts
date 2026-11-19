export type SectionId = 'videos' | 'articles' | 'gallery' | 'messages' | 'profile';

export interface VideoChapter {
  time: number; // seconds
  label: string;
}

export interface VideoItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  durationSeconds: number;
  durationLabel: string;
  resolution: string;
  director: string;
  date: string;
  cover: string;
  src: string;
  width: number;
  height: number;
  accentTint: string;
  motionStyle: 'drift-ocean' | 'precision-scan' | 'rain-shimmer' | 'sunlight-sweep' | 'prism-spectrum';
  chapters: VideoChapter[];
  description: string;
}

export interface ArticleItem {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readMinutes: number;
  likes: number;
  cover: string;
  quote: string;
  paragraphs: string[];
  /** 富文本正文（CMS 编辑器产出的 HTML），存在时优先渲染 */
  content?: string;
}

export interface PhotoItem {
  id: string;
  title: string;
  album: string;
  src: string;
  aspectRatio: '3:4' | '4:3' | '1:1' | '16:9';
  location: string;
  date: string;
  camera: string;
  lens: string;
  settings: string;
}

export interface UserProfile {
  name: string;
  handle: string;
  bio: string;
  location: string;
  avatar: string;
}

export interface MessageItem {
  id: string;
  /** 由 USER_ID 反查的展示昵称，不落库 */
  nickname: string;
  userId?: string;
  content: string;
  createdAt: string;
  likes: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

/** 留言下的公开回复：任何登录访客都可发表，也可以回复自己发布的留言 */
export interface MessageReply {
  id: string;
  messageId: string;
  /** 由 USER_ID 反查的展示昵称，不落库 */
  nickname: string;
  userId?: string;
  content: string;
  createdAt: string;
  /** 被回复者昵称，用于展示「回复 @xxx」 */
  replyToNickname?: string;
}

export const INITIAL_PROFILE: UserProfile = {
  name: '林屿',
  handle: '@linyu.atelier',
  bio: '视觉导演与交互设计师。关注极简建筑、物理动效与光学影像。',
  location: '上海 / 京都',
  avatar: '/src/assets/images/profile_avatar_studio_1795019175018.jpg',
};
