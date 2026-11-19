export type SectionId = 'videos' | 'articles' | 'gallery' | 'profile';

export interface VideoChapter {
  time: number; // seconds
  label: string;
}

export interface VideoItem {
  id: string;
  title: string;
  subtitle: string;
  category: '设计纪实' | '城市影像' | '自然声景';
  durationSeconds: number;
  durationLabel: string;
  resolution: string;
  director: string;
  date: string;
  cover: string;
  aspect: '16:9';
  accentTint: string;
  motionStyle: 'drift-ocean' | 'precision-scan' | 'rain-shimmer' | 'sunlight-sweep' | 'prism-spectrum';
  chapters: VideoChapter[];
  description: string;
}

export interface ArticleItem {
  id: string;
  title: string;
  excerpt: string;
  category: '设计' | '影像' | '技术' | '随笔';
  author: string;
  date: string;
  readMinutes: number;
  likes: number;
  cover: string;
  quote: string;
  paragraphs: string[];
}

export interface PhotoItem {
  id: string;
  title: string;
  album: '建筑' | '自然' | '静物' | '光影';
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

export const VIDEOS: VideoItem[] = [
  {
    id: 'vid-coast-horizon',
    title: '海崖之境：玻璃与潮汐的对话',
    subtitle: '一部关于极简海岸建筑与自然光影呼吸的 4K 空间纪实短片。',
    category: '设计纪实',
    durationSeconds: 268,
    durationLabel: '04:28',
    resolution: '4K HDR · 60fps',
    director: '林屿工作室',
    date: '2026年11月',
    cover: '/src/assets/images/video_hero_coast_1795019172940.jpg',
    aspect: '16:9',
    accentTint: '#1D4ED8',
    motionStyle: 'drift-ocean',
    chapters: [
      { time: 0, label: '蓝调时刻' },
      { time: 65, label: '悬崖结构' },
      { time: 142, label: '室内暖光' },
      { time: 210, label: '海雾消散' },
    ],
    description:
      '本片记录了一座悬于加州北部岩岸上的清水混凝土与超白玻璃住宅。摄影机以极缓慢的水平轨道穿行于晨昏交替之间，捕捉海雾如何轻触建筑边界，以及室内 2700K 暖光在冷冽海天之间的情绪张力。',
  },
  {
    id: 'vid-titanium-craft',
    title: '微米秩序：钛金属的切削韵律',
    subtitle: '深入精密加工工坊，凝视五轴 CNC 与手工倒角的触觉温度。',
    category: '设计纪实',
    durationSeconds: 194,
    durationLabel: '03:14',
    resolution: '4K ProRes · 60fps',
    director: '陈默',
    date: '2026年10月',
    cover: '/src/assets/images/video_studio_craft_1795019174302.jpg',
    aspect: '16:9',
    accentTint: '#475569',
    motionStyle: 'precision-scan',
    chapters: [
      { time: 0, label: '毛坯校准' },
      { time: 52, label: '刀路纹理' },
      { time: 120, label: '阳极氧化' },
      { time: 165, label: '终检装配' },
    ],
    description:
      '真正的工业质感源于对 0.01 毫米公差的执念。镜头紧贴 6AL-4V 航空钛合金与 6061-T6 铝合金表面，记录微距光线如何在拉丝纹路与倒角边缘缓缓流动。',
  },
  {
    id: 'vid-tokyo-rain',
    title: '雨夜纪行：东京玻璃幕墙之后',
    subtitle: '一场午夜阵雨过后，霓虹、湿润路面与安静咖啡馆的声景漫游。',
    category: '城市影像',
    durationSeconds: 312,
    durationLabel: '05:12',
    resolution: '4K Dolby Vision',
    director: '佐藤光',
    date: '2026年10月',
    cover: '/src/assets/images/video_urban_night_1795019174247.jpg',
    aspect: '16:9',
    accentTint: '#0284C7',
    motionStyle: 'rain-shimmer',
    chapters: [
      { time: 0, label: '初雨微光' },
      { time: 88, label: '橱窗暖意' },
      { time: 184, label: '十字路口' },
      { time: 260, label: '末班车后' },
    ],
    description:
      '采用 35mm 定焦大光圈手持拍摄，以空间双声道录制街角细雨与木门开合的真实声场，在喧嚣都市与静谧室内之间建立温柔的反差。',
  },
  {
    id: 'vid-courtyard-sun',
    title: '白墙与橄榄树：美术馆的午后时分',
    subtitle: '光影以每小时十五度的角度缓慢移动，丈量几何空间中的静默。',
    category: '自然声景',
    durationSeconds: 225,
    durationLabel: '03:45',
    resolution: '4K · 24fps',
    director: '周念',
    date: '2026年9月',
    cover: '/src/assets/images/article_architecture_1795019174097.jpg',
    aspect: '16:9',
    accentTint: '#0D9488',
    motionStyle: 'sunlight-sweep',
    chapters: [
      { time: 0, label: '正午留白' },
      { time: 75, label: '风过树影' },
      { time: 150, label: '水面折射' },
    ],
    description:
      '没有旁白，也没有配乐。全片仅保留水池微波与微风拂过橄榄叶的环境音，记录建筑中庭如何随着日照倾角的变化变成一架巨大的日晷。',
  },
  {
    id: 'vid-prism-optics',
    title: '折射率：镜头玻璃的诞生与色散',
    subtitle: '从稀土光学玻璃坯料到多层纳米镀膜，拆解一枚镜头的光学诗意。',
    category: '设计纪实',
    durationSeconds: 246,
    durationLabel: '04:06',
    resolution: '4K HDR · 60fps',
    director: '林屿工作室',
    date: '2026年9月',
    cover: '/src/assets/images/article_optics_lens_1795019174781.jpg',
    aspect: '16:9',
    accentTint: '#0071E3',
    motionStyle: 'prism-spectrum',
    chapters: [
      { time: 0, label: '玻璃研磨' },
      { time: 82, label: '镀膜显色' },
      { time: 164, label: '棱镜色散' },
    ],
    description:
      '当一束平行白光穿过三棱镜与双高斯镜头组，物理定律便转化成了视觉语言。影片以微观视角展示多层镀膜对眩光的驯服过程。',
  },
];

export const ARTICLES: ArticleItem[] = [
  {
    id: 'art-swiftui-physics',
    title: '弹簧的直觉：为什么优秀的界面动效从不让人等待',
    excerpt: '从物理阻尼方程到人类手眼的预期心理，探讨 SwiftUI 式交互响应背后的克制与精密。',
    category: '设计',
    author: '林屿',
    date: '2026年11月14日',
    readMinutes: 6,
    likes: 1286,
    cover: '/src/assets/images/article_optics_lens_1795019174781.jpg',
    quote: '真正流畅的动效不是为了展示动画本身，而是让数字元素遵守现实世界的惯性与质量感。',
    paragraphs: [
      '在早期的图形界面中，过渡动画往往依赖固定时长的线性或三次贝塞尔曲线。这种“预设时间”的逻辑在鼠标时代尚可胜任，但在直接触控与高刷新率屏幕普及之后，它暴露出一种机械的迟滞感：无论你的手指滑动得多快，卡片依然按照固定的 350 毫秒不紧不慢地移动。',
      'SwiftUI 所推崇的弹簧模型（Spring Physics）彻底改变了这一范式。它不预设动画必须持续多久，而是定义了刚度（Stiffness）、阻尼（Damping）与质量（Mass），并将用户手势释放瞬间的初速度无缝注入物理方程。于是界面有了重量，也有了即时的响应性。',
      '在网页端复现这种质感时，核心法则同样简洁：只对合成层属性（transform 与 opacity）施加动画，避免触发布局重排；将常规反馈控制在 200 毫秒内完成收敛；同时利用共享几何过渡（Matched Geometry），让列表卡片自然伸展为阅读容器，而非生硬地弹出一个孤立弹窗。',
      '克制同样重要。动画应当是空间关系的向导，当用户在标签之间切换、或将图片放大至全屏时，连续的位移轨迹能帮助大脑毫不费力地建立心理地图，这正是“直觉式交互”的本质所在。',
    ],
  },
  {
    id: 'art-negative-space',
    title: '留白的建筑学：光影如何替混凝土发声',
    excerpt: '当多余的装饰被尽数剥离，墙面、水池与午后斜阳便自然成为空间的叙事主体。',
    category: '随笔',
    author: '周念',
    date: '2026年11月8日',
    readMinutes: 5,
    likes: 843,
    cover: '/src/assets/images/article_architecture_1795019174097.jpg',
    quote: '空白并非什么都没有，它恰恰是为光线预留的舞台。',
    paragraphs: [
      '走进这座纯白混凝土围合的美术馆中庭时，最先令人放慢脚步的并非某件展品，而是脚下那片几乎没有纹理的水磨石地面，以及斜切过墙面的锐利日光。',
      '许多设计者常担忧“空旷”意味着信息密度不足，于是急切地用标语、框线或装饰纹理填满每一寸空间。然而在优秀的建筑与版式设计中，呼吸感恰恰来自大胆的减法：当主标题周围拥有足够宽阔的边距，文字本身的节奏和重量才会被真正看见。',
      '水池中的浅水如同一面天然的视网膜显示屏，将天空的云影和墙体边缘以极低的对比度二次折射回室内天花板。那种微妙的动态，比任何刻意设计的灯光秀都更加持久动人。',
    ],
  },
  {
    id: 'art-blue-hour-cinema',
    title: '蓝调二十分钟：海岸线上的电影色彩心理学',
    excerpt: '日落之后、夜幕尚未完全合拢的短暂窗口里，冷暖色温如何在同一帧画面中共存。',
    category: '影像',
    author: '陈默',
    date: '2026年10月29日',
    readMinutes: 7,
    likes: 2137,
    cover: '/src/assets/images/video_hero_coast_1795019172940.jpg',
    quote: '当室外天空降到 9000K 的深钴蓝，室内一盏 2700K 的落地灯就能讲述整个故事。',
    paragraphs: [
      '在电影摄影与建筑影像领域，“蓝调时刻”（Blue Hour）几乎拥有某种魔力。太阳已经落入地平线下方 4 到 8 度之间，直射硬光消失，整个海岸被均匀而柔和的天光包裹。',
      '此时拍摄玻璃幕墙建筑，相机无需面对正午剧烈的明暗反差。室外的海雾呈深邃的钢青色，而建筑内部点亮的钨丝灯与木质饰面则散发出琥珀般的暖意。冷暖对比在同一构图内达到天然平衡，不需要后期过度调色便自带电影级层次。',
      '在数码后期流程中，保留高光细节的关键在于对暗部噪点的宽容。不要追求绝对纯净的死黑，恰到好处的微弱银盐颗粒感反而能延续海风与潮湿空气的质感。',
    ],
  },
  {
    id: 'art-optical-precision',
    title: '从玻璃到像素：现代计算摄影的光学底线',
    excerpt: '算法可以重塑动态范围，但焦点之外的空气感与焦外散景依然忠实于玻璃曲率。',
    category: '技术',
    author: '顾言',
    date: '2026年10月19日',
    readMinutes: 8,
    likes: 967,
    cover: '/src/assets/images/article_optics_lens_1795019174781.jpg',
    quote: '计算负责把画面记录得更准确，而光学负责让光线在到达传感器前就已经动人。',
    paragraphs: [
      '过去十年，多帧合成与神经网络降噪彻底改写了移动摄影的边界。在极暗环境下，口袋大小的传感器也能输出接近专业机身的宽容度与清晰度。',
      '但当你把一张 35mm 定焦大光圈镜头拍摄的原片放大对比，仍能清晰分辨物理景深与算法虚化的差异。真实光学镜片在焦平面前后过渡时，会伴随着微弱的球面像差与边缘渐晕，让被摄主体仿佛自然浮于空气之中，而非被“抠图”贴在模糊的背景板上。',
      '因此，当代顶级的影像系统正走向两条路径的深度融合：用更精密的非球面镜片与抗反射镀膜保障纯净的入射光线，再由端侧算力实时完成色彩科学与微反差校准。',
    ],
  },
  {
    id: 'art-material-honesty',
    title: '材质的诚实：钛金属、灰泥与未漂白亚麻',
    excerpt: '为什么触手可及的天然质感，正在重新成为数字时代最稀缺的审美追求。',
    category: '设计',
    author: '林屿',
    date: '2026年10月3日',
    readMinutes: 4,
    likes: 1528,
    cover: '/src/assets/images/gallery_travertine_still_1795019174611.jpg',
    quote: '好的器物从不掩饰自己的来源，石材保留孔隙，金属保留切削轨迹。',
    paragraphs: [
      '当我们每天花上数小时注视一块高度抛光的玻璃屏幕，人类感官对于真实材质的渴望反而变得愈发敏锐。洞石器皿表面细小的气孔、未经染色的亚麻织物、经微喷砂处理的钛金属中框，它们共同的特征是“诚实”。',
      '在软件界面设计中，这种诚实同样成立。毛玻璃质感（Vibrancy & Backdrop Blur）之所以让人感到愉悦，是因为它让用户隐约感知到下方内容的色彩与层次，界面仿佛真的由一层半透明磨砂玻璃构成，而不是冰冷生硬的不透明色块。',
    ],
  },
];

export const PHOTOS: PhotoItem[] = [
  {
    id: 'pho-staircase',
    title: '旋转天光',
    album: '建筑',
    src: '/src/assets/images/gallery_staircase_light_1795019174115.jpg',
    aspectRatio: '3:4',
    location: '苏黎世 · 艺术馆',
    date: '2026.11',
    camera: 'Leica M11',
    lens: 'Summilux 35mm f/1.4',
    settings: 'f/5.6 · 1/250s · ISO 64',
  },
  {
    id: 'pho-alpine-mist',
    title: '银雾松林',
    album: '自然',
    src: '/src/assets/images/gallery_alpine_mist_1795019174189.jpg',
    aspectRatio: '3:4',
    location: '因特拉肯 · 晨雾',
    date: '2026.10',
    camera: 'Hasselblad X2D 100C',
    lens: 'XCD 90mm f/2.5V',
    settings: 'f/4.0 · 1/500s · ISO 100',
  },
  {
    id: 'pho-travertine',
    title: '洞石与枯枝',
    album: '静物',
    src: '/src/assets/images/gallery_travertine_still_1795019174611.jpg',
    aspectRatio: '1:1',
    location: '京都 · 东山工作室',
    date: '2026.10',
    camera: 'Leica Q3',
    lens: 'Summilux 28mm f/1.7',
    settings: 'f/2.8 · 1/160s · ISO 100',
  },
  {
    id: 'pho-courtyard',
    title: '几何正午',
    album: '建筑',
    src: '/src/assets/images/article_architecture_1795019174097.jpg',
    aspectRatio: '4:3',
    location: '直岛 · 现代庭院',
    date: '2026.09',
    camera: 'Fujifilm GFX100 II',
    lens: 'GF 45mm f/2.8',
    settings: 'f/8.0 · 1/800s · ISO 80',
  },
  {
    id: 'pho-coast-blue',
    title: '悬崖蓝调',
    album: '自然',
    src: '/src/assets/images/video_hero_coast_1795019172940.jpg',
    aspectRatio: '16:9',
    location: '大苏尔 · 岩岸',
    date: '2026.11',
    camera: 'Sony A7RV',
    lens: 'FE 24mm f/1.4 GM',
    settings: 'f/2.8 · 1/60s · ISO 400',
  },
  {
    id: 'pho-prism-ray',
    title: '折射光谱',
    album: '光影',
    src: '/src/assets/images/article_optics_lens_1795019174781.jpg',
    aspectRatio: '4:3',
    location: '上海 · 光学实验室',
    date: '2026.09',
    camera: 'Leica SL3',
    lens: 'APO-Summicron 50mm',
    settings: 'f/4.0 · 1/320s · ISO 100',
  },
  {
    id: 'pho-tokyo-wet',
    title: '雨后橱窗',
    album: '光影',
    src: '/src/assets/images/video_urban_night_1795019174247.jpg',
    aspectRatio: '16:9',
    location: '东京 · 青山通',
    date: '2026.10',
    camera: 'Leica M11',
    lens: 'Noctilux 50mm f/1.2',
    settings: 'f/1.4 · 1/125s · ISO 800',
  },
  {
    id: 'pho-titanium-macro',
    title: '机械切面',
    album: '静物',
    src: '/src/assets/images/video_studio_craft_1795019174302.jpg',
    aspectRatio: '16:9',
    location: '深圳 · 精密工坊',
    date: '2026.10',
    camera: 'Hasselblad X2D 100C',
    lens: 'XCD 120mm Macro',
    settings: 'f/5.6 · 1/125s · ISO 64',
  },
];

export const INITIAL_PROFILE: UserProfile = {
  name: '林屿',
  handle: '@linyu.atelier',
  bio: '视觉导演与交互设计师。关注极简建筑、物理动效与光学影像。',
  location: '上海 / 京都',
  avatar: '/src/assets/images/profile_avatar_studio_1795019175018.jpg',
};
