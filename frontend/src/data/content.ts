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
  /** 点赞数（后端统计） */
  likeCount?: number;
  /** 播放量（后端统计） */
  viewCount?: number;
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
  /** 封面图（等于 images[0]） */
  src: string;
  /** 该图文的全部图片：列表用封面轮播，详情按此顺序浏览 */
  images: string[];
  aspectRatio: '3:4' | '4:3' | '1:1' | '16:9';
  location: string;
  date: string;
  camera: string;
  lens: string;
  settings: string;
  /** 正文（笔记文字内容），详情页展示 */
  content?: string;
  /** 作者昵称（文本转图文的发布者） */
  author?: string;
  /** 点赞数（后端计数） */
  likeCount?: number;
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

/** 个人资料默认值：除头像外的文本信息全部留空，交由登录用户数据填充 */
export const INITIAL_PROFILE: UserProfile = {
  name: '',
  handle: '',
  bio: '',
  location: '',
  avatar: '/src/assets/images/profile_avatar_studio_1795019175018.jpg',
};
