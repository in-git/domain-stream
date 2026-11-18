import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type {
  ArticleItem,
  DashboardPayload,
  ImageTextItem,
  LoginActivity,
  TrafficPoint,
  UserProfile,
  VideoItem,
} from './src/types/cms.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'cms-db.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

interface StoredUser extends UserProfile {
  password: string;
}

interface CmsDatabase {
  users: StoredUser[];
  sessions: Record<string, string>;
  loginLogs: LoginActivity[];
  videos: VideoItem[];
  imagetexts: ImageTextItem[];
  articles: ArticleItem[];
  visitorState: {
    onlineNow: number;
    todayPV: number;
    todayUV: number;
    avgDurationSec: number;
    engagementRate: number;
    realtimePoints: TrafficPoint[];
  };
}

function createInitialDb(): CmsDatabase {
  const now = new Date();
  const fmtDate = (daysAgo: number) => {
    const d = new Date(now.getTime() - daysAgo * 86400_000);
    return d.toISOString();
  };

  const realtimePoints: TrafficPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 150_000);
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    const baseUv = 112 + Math.round(Math.sin(i * 0.45) * 24 + (23 - i) * 1.4);
    realtimePoints.push({
      label: `${hh}:${mm}`,
      uv: baseUv,
      pv: Math.round(baseUv * 2.35),
      avgStaySec: 185 + Math.round(Math.cos(i * 0.3) * 28),
    });
  }

  return {
    users: [
      {
        id: 'u-admin',
        email: 'admin@studio.cn',
        password: '123456',
        name: '林清禾',
        roleTitle: '内容主理人',
        department: '数字体验与视觉编辑部',
        avatarUrl: '/src/assets/images/avatar_admin_lin_1795026084667.jpg',
        bio: '负责视觉影像、空间美学图文专栏与深度长文的策划与发布审校，关注克制而精准的信息传达。',
        defaultModule: 'dashboard',
        liveRefresh: true,
        lastLoginAt: fmtDate(0),
      },
      {
        id: 'u-editor',
        email: 'editor@studio.cn',
        password: '123456',
        name: '陈屿',
        roleTitle: '高级内容编辑',
        department: '影像与专题中心',
        avatarUrl: '/src/assets/images/avatar_admin_lin_1795026084667.jpg',
        bio: '专注建筑空间短片剪辑与器物摄影专题编排。',
        defaultModule: 'dashboard',
        liveRefresh: true,
        lastLoginAt: fmtDate(1),
      },
    ],
    sessions: {},
    loginLogs: [
      {
        id: 'log-1',
        userId: 'u-admin',
        device: 'MacBook Pro · Safari 19',
        location: '中国 · 上海',
        ip: '101.88.42.19',
        timestamp: fmtDate(0),
      },
      {
        id: 'log-2',
        userId: 'u-admin',
        device: 'iPad Pro · Safari',
        location: '中国 · 上海',
        ip: '101.88.42.19',
        timestamp: fmtDate(2),
      },
    ],
    videos: [
      {
        id: 'vid-101',
        title: '工业设计工作室的晨光工作流',
        description: '记录清晨自然光影下，硬件设计团队如何通过极简桌面系统完成原型评审与材质打样。',
        category: '设计纪录',
        videoUrl: '',
        coverUrl: '/src/assets/images/video_cover_studio_1795026084973.jpg',
        durationSec: 228,
        resolution: '3840×2160',
        fileSizeBytes: 148_200_000,
        views: 12840,
        completionRate: 78,
        status: 'published',
        authorId: 'u-admin',
        authorName: '林清禾',
        createdAt: fmtDate(3),
        updatedAt: fmtDate(1),
      },
      {
        id: 'vid-102',
        title: '静谧庭院：石材与玻璃的几何对话',
        description: '以 4K 固定机位慢镜头呈现阴天漫射光中水院、石灰华立面与建筑廊道的比例秩序。',
        category: '建筑空间',
        videoUrl: '',
        coverUrl: '/src/assets/images/video_cover_architecture_1795026085698.jpg',
        durationSec: 315,
        resolution: '3840×2160',
        fileSizeBytes: 214_600_000,
        views: 9460,
        completionRate: 82,
        status: 'published',
        authorId: 'u-editor',
        authorName: '陈屿',
        createdAt: fmtDate(6),
        updatedAt: fmtDate(2),
      },
      {
        id: 'vid-103',
        title: '冬季手冲器皿开箱与质感特写',
        description: '待补充字幕轨与片尾品牌致谢片段，目前保存为内部审阅草稿。',
        category: '产品美学',
        videoUrl: '',
        coverUrl: '/src/assets/images/imagetext_coffee_morning_1795026087003.jpg',
        durationSec: 164,
        resolution: '1920×1080',
        fileSizeBytes: 86_400_000,
        views: 1420,
        completionRate: 64,
        status: 'draft',
        authorId: 'u-admin',
        authorName: '林清禾',
        createdAt: fmtDate(8),
        updatedAt: fmtDate(4),
      },
    ],
    imagetexts: [
      {
        id: 'img-201',
        title: '手工粗陶与石灰华台面的晨间静物',
        body: '北向窗台的自然漫射光总是最适合呈现哑光釉面的颗粒感。这组器物由景德镇独立窑口烧制，刻意保留胎土微小的铁点与手拉坯留下的指腹弧度，放置在未经抛光的石灰华石材上，形成温度与质地的对照。',
        category: '器物美学',
        location: '上海 · 安福路工作室',
        images: [
          '/src/assets/images/imagetext_ceramic_craft_1795026086456.jpg',
          '/src/assets/images/imagetext_coffee_morning_1795026087003.jpg',
          '/src/assets/images/article_cover_typography_1795026087411.jpg',
        ],
        views: 8730,
        likes: 642,
        status: 'published',
        authorId: 'u-admin',
        authorName: '林清禾',
        createdAt: fmtDate(2),
        updatedAt: fmtDate(1),
      },
      {
        id: 'img-202',
        title: '上午九点的手冲仪式与笔记整理',
        body: '用 92℃ 热水缓慢注水，记录一段关于耶加雪菲花香与柑橘调的清晨笔记。白蜡木桌面留出足够的留白，让思路在开始一天的工作前先安定下来。',
        category: '生活方式',
        location: '杭州 · 天目里',
        images: [
          '/src/assets/images/imagetext_coffee_morning_1795026087003.jpg',
          '/src/assets/images/video_cover_studio_1795026084973.jpg',
        ],
        views: 6540,
        likes: 518,
        status: 'published',
        authorId: 'u-editor',
        authorName: '陈屿',
        createdAt: fmtDate(5),
        updatedAt: fmtDate(3),
      },
      {
        id: 'img-203',
        title: '空间采风集：水院光影的四个时刻',
        body: '从清晨七点到傍晚五点，记录同一个庭院在不同云层厚度下的倒影层次。',
        category: '建筑摄影',
        location: '苏州 · 园区',
        images: [
          '/src/assets/images/video_cover_architecture_1795026085698.jpg',
          '/src/assets/images/imagetext_ceramic_craft_1795026086456.jpg',
        ],
        views: 980,
        likes: 94,
        status: 'draft',
        authorId: 'u-admin',
        authorName: '林清禾',
        createdAt: fmtDate(7),
        updatedAt: fmtDate(6),
      },
    ],
    articles: [
      {
        id: 'art-301',
        title: '版式秩序与留白：如何构建克制的数字阅读体验',
        summary: '从瑞士网格系统到当代桌面应用排版，探讨字距、行高、对比度与视觉呼吸感如何共同决定信息的可读性。',
        content: `## 为什么留白不是浪费空间\n\n在密集信息环境中，真正稀缺的并不是像素，而是用户的注意力。合理的留白能够为视线提供清晰的停靠点，让标题、正文与数据表格之间建立自然的层级关系。\n\n### 1. 字号与行宽的黄金比例\n\n中文与西文混排时，建议将正文字号控制在 15px 至 16px 之间，行高保持在 1.65 至 1.75 倍，每行阅读长度维持在 34 至 42 个汉字左右，可以显著降低长文阅读的眼部疲劳。\n\n### 2. 用质感替代多余装饰\n\n与其使用高饱和渐变或繁复阴影，不如依靠细腻的 1px 分割线、克制的灰阶层次与等宽数字对齐，让内容本身成为界面主角。`,
        category: '设计方法论',
        coverUrl: '/src/assets/images/article_cover_typography_1795026087411.jpg',
        wordCount: 1680,
        readTimeMin: 6,
        views: 11290,
        avgReadRate: 74,
        status: 'published',
        authorId: 'u-admin',
        authorName: '林清禾',
        createdAt: fmtDate(4),
        updatedAt: fmtDate(1),
      },
      {
        id: 'art-302',
        title: '从实体工作台到数字内容系统的视觉一致性',
        summary: '好的内容工作台应当像一张整理得当的实木桌面：常用工具触手可及，状态反馈安静而准确。',
        content: `## 减少操作摩擦的核心原则\n\n内容创作者在上传视频、整理多图画廊与撰写长文时，最怕被频繁弹窗和冗长表单打断节奏。\n\n### 即时反馈与自动提取\n\n当一段视频拖入上传区时，系统应当自动识别时长、分辨率并截取首帧封面，而不是让创作者手动填写技术参数。`,
        category: '产品思考',
        coverUrl: '/src/assets/images/video_cover_studio_1795026084973.jpg',
        wordCount: 1240,
        readTimeMin: 4,
        views: 7410,
        avgReadRate: 69,
        status: 'published',
        authorId: 'u-editor',
        authorName: '陈屿',
        createdAt: fmtDate(9),
        updatedAt: fmtDate(3),
      },
      {
        id: 'art-303',
        title: '年度内容传播复盘：视频完播率与图文互动的关联观察',
        summary: '结合近三个季度的站内访客行为数据，梳理不同内容载体在夜间与午间时段的消费规律。',
        content: `## 正在整理第三季度数据图表\n\n初步观察显示，周末早间 9 点至 11 点期间，图文专题的分享转发率明显高于工作日；而深度视频则集中在晚间 20 点后获得最高完播率。`,
        category: '数据洞察',
        coverUrl: '/src/assets/images/video_cover_architecture_1795026085698.jpg',
        wordCount: 890,
        readTimeMin: 3,
        views: 640,
        avgReadRate: 52,
        status: 'draft',
        authorId: 'u-admin',
        authorName: '林清禾',
        createdAt: fmtDate(11),
        updatedAt: fmtDate(5),
      },
    ],
    visitorState: {
      onlineNow: 148,
      todayPV: 18426,
      todayUV: 6842,
      avgDurationSec: 214,
      engagementRate: 68.4,
      realtimePoints,
    },
  };
}

function loadDb(): CmsDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw) as CmsDatabase;
    }
  } catch (err) {
    console.error('Failed to read CMS DB, reinitializing:', err);
  }
  const initial = createInitialDb();
  saveDb(initial);
  return initial;
}

function saveDb(db: CmsDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save CMS DB:', err);
  }
}

let db = loadDb();

function sanitizeUser(u: StoredUser): UserProfile {
  const { password: _password, ...profile } = u;
  return profile;
}

function getAuthUser(req: express.Request): StoredUser | null {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const userId = db.sessions[token];
  if (!userId) return null;
  return db.users.find((u) => u.id === userId) || null;
}

function requireAuth(req: express.Request, res: express.Response): StoredUser | null {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: '请先登录管理账号' });
    return null;
  }
  return user;
}

function buildDashboardPayload(): DashboardPayload {
  const videoViews = db.videos.reduce((s, v) => s + v.views, 0);
  const imageTextViews = db.imagetexts.reduce((s, v) => s + v.views, 0);
  const articleViews = db.articles.reduce((s, v) => s + v.views, 0);

  const week: TrafficPoint[] = [
    { label: '周一', uv: 5120, pv: 12940, avgStaySec: 196 },
    { label: '周二', uv: 5640, pv: 14120, avgStaySec: 204 },
    { label: '周三', uv: 6180, pv: 15890, avgStaySec: 212 },
    { label: '周四', uv: 5890, pv: 14950, avgStaySec: 208 },
    { label: '周五', uv: 6520, pv: 17110, avgStaySec: 219 },
    { label: '周六', uv: 7190, pv: 19450, avgStaySec: 234 },
    { label: '今日', uv: db.visitorState.todayUV, pv: db.visitorState.todayPV, avgStaySec: db.visitorState.avgDurationSec },
  ];

  const month: TrafficPoint[] = [
    { label: '11-05', uv: 4320, pv: 10840, avgStaySec: 184 },
    { label: '11-06', uv: 4680, pv: 11720, avgStaySec: 188 },
    { label: '11-07', uv: 5120, pv: 12890, avgStaySec: 195 },
    { label: '11-08', uv: 4910, pv: 12100, avgStaySec: 191 },
    { label: '11-09', uv: 5450, pv: 13960, avgStaySec: 202 },
    { label: '11-10', uv: 5890, pv: 15120, avgStaySec: 207 },
    { label: '11-11', uv: 6340, pv: 16480, avgStaySec: 215 },
    { label: '11-12', uv: 5980, pv: 15430, avgStaySec: 209 },
    { label: '11-13', uv: 6210, pv: 16190, avgStaySec: 211 },
    { label: '11-14', uv: 6490, pv: 16920, avgStaySec: 216 },
    { label: '11-15', uv: 6780, pv: 17850, avgStaySec: 221 },
    { label: '11-16', uv: 6620, pv: 17310, avgStaySec: 218 },
    { label: '11-17', uv: 6950, pv: 18190, avgStaySec: 224 },
    { label: '今日', uv: db.visitorState.todayUV, pv: db.visitorState.todayPV, avgStaySec: db.visitorState.avgDurationSec },
  ];

  const topContent = [
    ...db.videos.map((v) => ({
      id: v.id,
      type: 'video' as const,
      title: v.title,
      views: v.views,
      metricLabel: `完播率 ${v.completionRate}%`,
      updatedAt: v.updatedAt,
    })),
    ...db.imagetexts.map((i) => ({
      id: i.id,
      type: 'imagetext' as const,
      title: i.title,
      views: i.views,
      metricLabel: `点赞 ${i.likes}`,
      updatedAt: i.updatedAt,
    })),
    ...db.articles.map((a) => ({
      id: a.id,
      type: 'article' as const,
      title: a.title,
      views: a.views,
      metricLabel: `阅读完成 ${a.avgReadRate}%`,
      updatedAt: a.updatedAt,
    })),
  ]
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  return {
    snapshot: {
      onlineNow: db.visitorState.onlineNow,
      todayPV: db.visitorState.todayPV,
      todayUV: db.visitorState.todayUV,
      pvGrowthPercent: 14.2,
      uvGrowthPercent: 11.8,
      avgDurationSec: db.visitorState.avgDurationSec,
      engagementRate: db.visitorState.engagementRate,
      mobileSharePercent: 62,
      desktopSharePercent: 38,
      updatedAt: new Date().toISOString(),
    },
    series: {
      realtime: db.visitorState.realtimePoints,
      week,
      month,
    },
    moduleStats: {
      videos: {
        count: db.videos.length,
        published: db.videos.filter((v) => v.status === 'published').length,
        totalViews: videoViews,
      },
      imagetexts: {
        count: db.imagetexts.length,
        published: db.imagetexts.filter((v) => v.status === 'published').length,
        totalViews: imageTextViews,
      },
      articles: {
        count: db.articles.length,
        published: db.articles.filter((v) => v.status === 'published').length,
        totalViews: articleViews,
      },
    },
    sources: [
      { name: '直接访问与书签', visits: Math.round(db.visitorState.todayUV * 0.41), percentage: 41 },
      { name: '搜索引擎自然流量', visits: Math.round(db.visitorState.todayUV * 0.29), percentage: 29 },
      { name: '社交分享与专栏引用', visits: Math.round(db.visitorState.todayUV * 0.19), percentage: 19 },
      { name: 'RSS 与邮件订阅', visits: Math.round(db.visitorState.todayUV * 0.11), percentage: 11 },
    ],
    topContent,
  };
}

// SSE clients for real-time visitor updates
const sseClients = new Set<express.Response>();

setInterval(() => {
  const deltaOnline = Math.floor(Math.random() * 7) - 3;
  db.visitorState.onlineNow = Math.max(85, Math.min(240, db.visitorState.onlineNow + deltaOnline));
  const pvIncrement = Math.floor(Math.random() * 5) + 1;
  const uvIncrement = Math.random() > 0.45 ? Math.floor(Math.random() * 2) + 1 : 0;
  db.visitorState.todayPV += pvIncrement;
  db.visitorState.todayUV += uvIncrement;

  const last = db.visitorState.realtimePoints[db.visitorState.realtimePoints.length - 1];
  const now = new Date();
  const label = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  if (last) {
    db.visitorState.realtimePoints = [
      ...db.visitorState.realtimePoints.slice(1),
      {
        label,
        uv: db.visitorState.onlineNow,
        pv: Math.round(db.visitorState.onlineNow * 2.25 + pvIncrement * 4),
        avgStaySec: db.visitorState.avgDurationSec,
      },
    ];
  }

  const payload = JSON.stringify({
    onlineNow: db.visitorState.onlineNow,
    todayPV: db.visitorState.todayPV,
    todayUV: db.visitorState.todayUV,
    avgDurationSec: db.visitorState.avgDurationSec,
    engagementRate: db.visitorState.engagementRate,
    latestPoint: db.visitorState.realtimePoints[db.visitorState.realtimePoints.length - 1],
    updatedAt: now.toISOString(),
  });

  for (const client of sseClients) {
    client.write(`data: ${payload}\n\n`);
  }
}, 3000);

// Persist visitor counters every 30s
setInterval(() => {
  saveDb(db);
}, 30000);

async function startServer() {
  const app = express();

  // Raw binary upload endpoint (zero external dependency, supports real progress bar)
  app.post(
    '/api/upload',
    express.raw({ type: '*/*', limit: '200mb' }),
    (req, res) => {
      const user = requireAuth(req, res);
      if (!user) return;

      const rawNameHeader = req.headers['x-file-name'];
      const decodedName = typeof rawNameHeader === 'string'
        ? decodeURIComponent(rawNameHeader)
        : 'media-file';
      const ext = path.extname(decodedName).toLowerCase() || '.bin';
      const safeExt = /^[a-z0-9.]+$/.test(ext) ? ext : '.bin';
      const fileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`;
      const targetPath = path.join(UPLOAD_DIR, fileName);

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({ error: '上传文件为空' });
        return;
      }

      fs.writeFileSync(targetPath, req.body);
      res.json({
        url: `/uploads/${fileName}`,
        filename: decodedName,
        size: req.body.length,
        mimeType: req.headers['content-type'] || 'application/octet-stream',
      });
    }
  );

  app.use(express.json({ limit: '25mb' }));
  app.use('/uploads', express.static(UPLOAD_DIR));

  // Auth routes (Login only — no registration by requirement)
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const found = db.users.find(
      (u) => u.email.toLowerCase() === String(email || '').trim().toLowerCase() && u.password === String(password || '')
    );
    if (!found) {
      res.status(401).json({ error: '账号或密码不正确，请检查预设账号信息' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = found.id;
    found.lastLoginAt = new Date().toISOString();
    db.loginLogs.unshift({
      id: `log-${Date.now()}`,
      userId: found.id,
      device: String(req.headers['user-agent'] || '').includes('Mac') ? 'Mac · Web Console' : 'Desktop · Web Console',
      location: '当前工作区',
      ip: req.ip || '127.0.0.1',
      timestamp: found.lastLoginAt,
    });
    db.loginLogs = db.loginLogs.slice(0, 20);
    saveDb(db);

    res.json({
      token,
      user: sanitizeUser(found),
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    res.json({
      user: sanitizeUser(user),
      logs: db.loginLogs.filter((l) => l.userId === user.id).slice(0, 8),
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (token && db.sessions[token]) {
      delete db.sessions[token];
      saveDb(db);
    }
    res.json({ ok: true });
  });

  app.put('/api/profile', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const { name, roleTitle, department, bio, avatarUrl, defaultModule, liveRefresh } = req.body as Partial<UserProfile>;
    if (name !== undefined) user.name = name.trim() || user.name;
    if (roleTitle !== undefined) user.roleTitle = roleTitle.trim() || user.roleTitle;
    if (department !== undefined) user.department = department.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (defaultModule !== undefined) user.defaultModule = defaultModule;
    if (liveRefresh !== undefined) user.liveRefresh = liveRefresh;
    saveDb(db);
    res.json({ user: sanitizeUser(user) });
  });

  app.put('/api/profile/password', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (user.password !== currentPassword) {
      res.status(400).json({ error: '当前密码验证失败' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: '新密码长度至少为 6 位' });
      return;
    }
    user.password = newPassword;
    saveDb(db);
    res.json({ ok: true });
  });

  // Dashboard & Live visitor SSE
  app.get('/api/dashboard', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    res.json(buildDashboardPayload());
  });

  app.get('/api/visitors/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);
    const initialPayload = JSON.stringify({
      onlineNow: db.visitorState.onlineNow,
      todayPV: db.visitorState.todayPV,
      todayUV: db.visitorState.todayUV,
      avgDurationSec: db.visitorState.avgDurationSec,
      engagementRate: db.visitorState.engagementRate,
      latestPoint: db.visitorState.realtimePoints[db.visitorState.realtimePoints.length - 1],
      updatedAt: new Date().toISOString(),
    });
    res.write(`data: ${initialPayload}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.post('/api/visitors/track', (req, res) => {
    const { type, id } = req.body as { type?: string; id?: string };
    db.visitorState.todayPV += 1;
    if (type === 'video' && id) {
      const item = db.videos.find((v) => v.id === id);
      if (item) item.views += 1;
    } else if (type === 'imagetext' && id) {
      const item = db.imagetexts.find((v) => v.id === id);
      if (item) item.views += 1;
    } else if (type === 'article' && id) {
      const item = db.articles.find((v) => v.id === id);
      if (item) item.views += 1;
    }
    saveDb(db);
    res.json({ todayPV: db.visitorState.todayPV });
  });

  // Videos CRUD
  app.get('/api/videos', (req, res) => {
    if (!requireAuth(req, res)) return;
    res.json({ items: db.videos });
  });

  app.post('/api/videos', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = req.body as Partial<VideoItem>;
    const nowIso = new Date().toISOString();
    const item: VideoItem = {
      id: `vid-${Date.now()}`,
      title: (body.title || '未命名视频').trim(),
      description: (body.description || '').trim(),
      category: (body.category || '精选视频').trim(),
      videoUrl: body.videoUrl || '',
      coverUrl: body.coverUrl || '/src/assets/images/video_cover_studio_1795026084973.jpg',
      durationSec: Number(body.durationSec) || 120,
      resolution: body.resolution || '1920×1080',
      fileSizeBytes: Number(body.fileSizeBytes) || 0,
      views: 0,
      completionRate: 100,
      status: body.status === 'draft' ? 'draft' : 'published',
      authorId: user.id,
      authorName: user.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.videos.unshift(item);
    saveDb(db);
    res.status(201).json({ item });
  });

  app.put('/api/videos/:id', (req, res) => {
    if (!requireAuth(req, res)) return;
    const idx = db.videos.findIndex((v) => v.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '视频不存在' });
      return;
    }
    const current = db.videos[idx];
    const body = req.body as Partial<VideoItem>;
    db.videos[idx] = {
      ...current,
      ...body,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
    res.json({ item: db.videos[idx] });
  });

  app.delete('/api/videos/:id', (req, res) => {
    if (!requireAuth(req, res)) return;
    const idx = db.videos.findIndex((v) => v.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '视频不存在' });
      return;
    }
    db.videos.splice(idx, 1);
    saveDb(db);
    res.json({ ok: true });
  });

  // ImageTexts CRUD
  app.get('/api/imagetexts', (req, res) => {
    if (!requireAuth(req, res)) return;
    res.json({ items: db.imagetexts });
  });

  app.post('/api/imagetexts', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = req.body as Partial<ImageTextItem>;
    const nowIso = new Date().toISOString();
    const item: ImageTextItem = {
      id: `img-${Date.now()}`,
      title: (body.title || '未命名图文').trim(),
      body: (body.body || '').trim(),
      category: (body.category || '视觉画廊').trim(),
      location: (body.location || '').trim(),
      images: Array.isArray(body.images) && body.images.length > 0
        ? body.images
        : ['/src/assets/images/imagetext_ceramic_craft_1795026086456.jpg'],
      views: 0,
      likes: 0,
      status: body.status === 'draft' ? 'draft' : 'published',
      authorId: user.id,
      authorName: user.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.imagetexts.unshift(item);
    saveDb(db);
    res.status(201).json({ item });
  });

  app.put('/api/imagetexts/:id', (req, res) => {
    if (!requireAuth(req, res)) return;
    const idx = db.imagetexts.findIndex((v) => v.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '图文不存在' });
      return;
    }
    const current = db.imagetexts[idx];
    const body = req.body as Partial<ImageTextItem>;
    db.imagetexts[idx] = {
      ...current,
      ...body,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
    res.json({ item: db.imagetexts[idx] });
  });

  app.delete('/api/imagetexts/:id', (req, res) => {
    if (!requireAuth(req, res)) return;
    const idx = db.imagetexts.findIndex((v) => v.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '图文不存在' });
      return;
    }
    db.imagetexts.splice(idx, 1);
    saveDb(db);
    res.json({ ok: true });
  });

  // Articles CRUD
  app.get('/api/articles', (req, res) => {
    if (!requireAuth(req, res)) return;
    res.json({ items: db.articles });
  });

  app.post('/api/articles', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = req.body as Partial<ArticleItem>;
    const nowIso = new Date().toISOString();
    const contentText = (body.content || '').trim();
    const wordCount = contentText.replace(/\s+/g, '').length;
    const item: ArticleItem = {
      id: `art-${Date.now()}`,
      title: (body.title || '未命名文章').trim(),
      summary: (body.summary || contentText.slice(0, 80)).trim(),
      content: contentText,
      category: (body.category || '专栏文章').trim(),
      coverUrl: body.coverUrl || '/src/assets/images/article_cover_typography_1795026087411.jpg',
      wordCount,
      readTimeMin: Math.max(1, Math.ceil(wordCount / 300)),
      views: 0,
      avgReadRate: 75,
      status: body.status === 'draft' ? 'draft' : 'published',
      authorId: user.id,
      authorName: user.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.articles.unshift(item);
    saveDb(db);
    res.status(201).json({ item });
  });

  app.put('/api/articles/:id', (req, res) => {
    if (!requireAuth(req, res)) return;
    const idx = db.articles.findIndex((v) => v.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '文章不存在' });
      return;
    }
    const current = db.articles[idx];
    const body = req.body as Partial<ArticleItem>;
    const contentText = body.content !== undefined ? body.content.trim() : current.content;
    const wordCount = contentText.replace(/\s+/g, '').length;
    db.articles[idx] = {
      ...current,
      ...body,
      id: current.id,
      content: contentText,
      wordCount,
      readTimeMin: Math.max(1, Math.ceil(wordCount / 300)),
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
    res.json({ item: db.articles[idx] });
  });

  app.delete('/api/articles/:id', (req, res) => {
    if (!requireAuth(req, res)) return;
    const idx = db.articles.findIndex((v) => v.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '文章不存在' });
      return;
    }
    db.articles.splice(idx, 1);
    saveDb(db);
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CueStudio server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
