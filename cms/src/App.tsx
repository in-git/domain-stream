import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { api, getStoredToken, setStoredToken } from './lib/api.ts';
import type { ArticlePageQuery, GraphicPageQuery, VideoPageQuery } from './lib/snowy.ts';
import { deleteFilesByUrls, resourceUrlsInHtml } from './lib/fileCenter.ts';
import { getCachedMenu, onAuthExpired, type SnowyMenu } from './lib/snowy.ts';
import {
  hasModulePerm,
  menuNodeToModule,
  modulesFromMenu,
  resolveDefaultModule,
  type DynamicModule,
} from './lib/menu.ts';
import {
  forgetModule,
  moduleFromStorage,
  navigateToRoute,
  parseRoute,
  resolveInitialRoute,
  routeModule,
  type AppRoute,
  type ContentAction,
  type ContentModule,
} from './lib/router.ts';
import type {
  ArticleItem,
  ImageTextItem,
  ModuleKey,
  UserProfile,
  VideoItem,
} from './types/cms.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { AppToast, showToast } from './components/AppToast.tsx';
import { DeleteConfirmPage } from './components/DeleteConfirmPage.tsx';
import { QuickCreatePage } from './components/QuickCreatePage.tsx';
import { NoAccessPage, PageNotFound } from './components/PageShell.tsx';
import { LoginView } from './views/login/LoginView.tsx';
import { DashboardView } from './views/dashboard/DashboardView.tsx';
import { VideoManagerView } from './views/biz/video/VideoManagerView.tsx';
import { ImageTextManagerView } from './views/biz/imagetext/ImageTextManagerView.tsx';
import { ArticleManagerView } from './views/biz/article/ArticleManagerView.tsx';
import { PersonalCenterView } from './views/profile/PersonalCenterView.tsx';
import { ExternalMenuView } from './views/system/ExternalMenuView.tsx';
import { VideoEditorPage } from './views/biz/video/VideoPages.tsx';
import { VideoBatchUploadModal } from './views/biz/video/VideoBatchUploadModal.tsx';
import { collectDroppedImages, collectDroppedVideos } from './lib/videoDrop.ts';
import {
  ImageTextEditorPage,
  ImageViewPage,
} from './views/biz/imagetext/ImageTextPages.tsx';
import {
  ArticleEditorPage,
  ArticleReaderPage,
} from './views/biz/article/ArticlePages.tsx';
import CategoryView from './views/biz/category/index.tsx';
import MessageView from './views/biz/message/index.tsx';
import CommentView from './views/biz/comment/index.tsx';
import FileCenterView from './views/biz/file/index.tsx';
import MaterialCenterView from './views/biz/material/index.tsx';
import AssetResourceView from './views/biz/asset-resource/index.tsx';
import ConfigView from './views/biz/config/index.tsx';

const MODULE_TITLES: Record<ModuleKey, string> = {
  dashboard: '首页看板',
  videos: '视频管理',
  imagetexts: '图文管理',
  articles: '文章管理',
  category: '通用分类',
  messages: '留言管理',
  comments: '评论管理',
  files: '文件中心',
  materials: '素材中心',
  assetResource: '素材资源库',
  config: '页面配置',
  profile: '个人中心',
};

const CONTENT_NAMES: Record<ContentModule, string> = {
  videos: '视频',
  imagetexts: '图文',
  articles: '文章',
};

const ACTION_NAMES: Record<ContentAction, string> = {
  new: '新建',
  edit: '编辑',
  view: '预览',
  delete: '删除',
};

/** 全部内置模块，供尚未拿到菜单前的首屏使用 */
const FALLBACK_MODULES: DynamicModule[] = modulesFromMenu(null);

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [modules, setModules] = useState<DynamicModule[]>(FALLBACK_MODULES);
  const [permissions, setPermissions] = useState<string[]>([]);
  // 后端 /sys/userCenter/loginMenu 返回的原始菜单树，侧边栏据此动态渲染
  const [menuTree, setMenuTree] = useState<SnowyMenu[]>(() => getCachedMenu() || []);
  // 当前选中的外部菜单（私域工作台未内置对应页面的后台菜单）
  const [externalMenu, setExternalMenu] = useState<SnowyMenu | null>(null);
  const [route, setRoute] = useState<AppRoute>({ kind: 'module', module: 'dashboard' });
  const [lastModule, setLastModule] = useState<ModuleKey>(
    () => moduleFromStorage() || 'dashboard'
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // 内容区拖拽：根据当前模块分流到视频/图文导入逻辑
  const [contentDropActive, setContentDropActive] = useState(false);
  const contentDragDepthRef = useRef(0);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [pendingImageFiles, setPendingImageFiles] = useState<File[] | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[] | null>(null);

  // 统一跳转：更新 state + URL hash；列表用 replace，子页面用 push（浏览器可返回）
  const go = useCallback((next: AppRoute, replace = false) => {
    setExternalMenu(null);
    setRoute(navigateToRoute(next, replace));
  }, []);
  /** 清空会话状态并回到登录页（鉴权失效/被顶下线时调用，不再请求 logout） */
  const resetToLogin = useCallback(() => {
    setUser(null);
    setModules(FALLBACK_MODULES);
    setPermissions([]);
    setMenuTree([]);
    setExternalMenu(null);
    forgetModule();
    go({ kind: 'module', module: 'dashboard' }, true);
  }, [go]);

  const goModule = useCallback(
    (mod: ModuleKey) => go({ kind: 'module', module: mod }, true),
    [go]
  );

  /** 树形菜单叶子点击：命中内置模块则正常导航，否则渲染外部菜单占位页 */
  const handleSelectMenu = useCallback(
    (node: SnowyMenu) => {
      const target = menuNodeToModule(node);
      if (target) goModule(target);
      else setExternalMenu(node);
    },
    [goModule]
  );
  const goContent = useCallback(
    (module: ContentModule, action: ContentAction, id?: string, slide?: number) =>
      go({ kind: 'content', module, action, id, slide }),
    [go]
  );

  /** 图文列表拖拽：图片进入图文编辑器 */
  const handleDroppedImages = useCallback(
    async (dataTransfer: DataTransfer) => {
      const { files } = await collectDroppedImages(dataTransfer);
      if (!files.length) {
        showToast('未发现可上传的图片文件', 'warning');
        return;
      }
      if (!hasModulePerm('imagetexts', 'Add', permissions)) {
        showToast('当前账号没有新增图文权限', 'danger');
        return;
      }
      setPendingImageFiles(files);
      goContent('imagetexts', 'new');
    },
    [goContent, permissions]
  );

  /** 视频列表表格拖入：单个进入编辑器，多个/文件夹进入批量表格 */
  const handleDroppedVideos = useCallback(
    async (dataTransfer: DataTransfer) => {
      const { files, hasDirectory } = await collectDroppedVideos(dataTransfer);
      if (!files.length) {
        showToast('未发现可上传的视频文件', 'warning');
        return;
      }
      if (!hasModulePerm('videos', 'Add', permissions)) {
        showToast('当前账号没有新增视频权限', 'danger');
        return;
      }
      if (files.length === 1 && !hasDirectory) {
        setPendingVideoFile(files[0]);
        goContent('videos', 'new');
        return;
      }
      setBatchFiles(files);
    },
    [goContent, permissions]
  );

  // 浏览器前进/后退或直接修改 hash 时同步视图
  useEffect(() => {
    const onRouteChange = () => {
      setExternalMenu(null);
      setRoute(parseRoute());
      setMobileNavOpen(false);
    };
    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);
    return () => {
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
    };
  }, []);

  // 任一请求命中重登码（含被顶下线）时，强制清空会话并回到登录页
  useEffect(() => onAuthExpired(() => resetToLogin()), [resetToLogin]);

  // 低频探活：用户静止在任意页面时也能及时发现会话被顶下线
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => {
      void api.me().catch(() => {
        // 鉴权失效时 me() 内部会清缓存并触发 onAuthExpired
      });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [user]);

  // 快速创建页没有对应侧边栏项，沿用进入前的模块高亮
  useEffect(() => {
    if (route.kind !== 'quick') setLastModule(routeModule(route));
  }, [route]);

  const activeModule = route.kind === 'quick' ? lastModule : routeModule(route);

  /** 内容区拖拽：按当前模块分流；仅在模块列表页生效，详情页不劫持文件 */
  const handleContentDrop = useCallback(
    (dataTransfer: DataTransfer) => {
      if (route.kind !== 'module') return;
      if (activeModule === 'videos') {
        void handleDroppedVideos(dataTransfer);
        return;
      }
      if (activeModule === 'imagetexts') {
        void handleDroppedImages(dataTransfer);
        return;
      }
      // 其他模块（含素材中心）不在此处处理拖拽上传，也不弹提示
      // 素材中心由页面自身的拖拽逻辑打开上传弹窗
    },
    [activeModule, route.kind, handleDroppedVideos, handleDroppedImages]
  );

  function isFileDrag(event: DragEvent<HTMLDivElement>) {
    return Array.from(event.dataTransfer.types || []).includes('Files');
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (
      route.kind !== 'module' ||
      (activeModule !== 'videos' && activeModule !== 'imagetexts') ||
      !isFileDrag(event)
    ) return;
    event.preventDefault();
    contentDragDepthRef.current += 1;
    setContentDropActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    contentDragDepthRef.current = 0;
    setContentDropActive(false);
  }

  function handleContentDragDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    contentDragDepthRef.current = 0;
    setContentDropActive(false);
    handleContentDrop(event.dataTransfer);
  }

  // 列表路由越权拦截（如手动改 hash 到无权限模块）
  const moduleBlocked =
    route.kind === 'module' && !modules.some((m) => m.key === route.module);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videoTotal, setVideoTotal] = useState(0);
  const [myVideoCount, setMyVideoCount] = useState(0);
  const [myArticleCount, setMyArticleCount] = useState(0);
  const [videoDetail, setVideoDetail] = useState<VideoItem | null>(null);
  const [videoDetailLoading, setVideoDetailLoading] = useState(false);
  const [videosLoading, setVideosLoading] = useState(false);
  const initialVideoQuery: VideoPageQuery = { current: 1, size: 20, sortOrder: 'DESCEND' };
  const [videoQuery, setVideoQuery] = useState<VideoPageQuery>(initialVideoQuery);
  const [imagetextsLoading, setImagetextsLoading] = useState(false);
  const initialImageTextQuery: GraphicPageQuery = { current: 1, size: 20, sortOrder: 'DESCEND' };
  const [imageTextQuery, setImageTextQuery] = useState<GraphicPageQuery>(initialImageTextQuery);
  const [imagetexts, setImagetexts] = useState<ImageTextItem[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const initialArticleQuery: ArticlePageQuery = { current: 1, size: 20, sortOrder: 'DESCEND' };
  const [articleQuery, setArticleQuery] = useState<ArticlePageQuery>(initialArticleQuery);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  // 各模块是否已加载完成（驱动详情页加载态）
  const [moduleReady, setModuleReady] = useState<Record<ContentModule, boolean>>({
    videos: false,
    imagetexts: false,
    articles: false,
  });

  // 按模块懒加载：记录已加载过的模块，避免重复请求；刷新时强制重新拉取
  const loadedRef = useRef<Record<ContentModule, boolean>>({
    videos: false,
    imagetexts: false,
    articles: false,
  });
  const loadingRef = useRef<Record<ContentModule, boolean>>({
    videos: false,
    imagetexts: false,
    articles: false,
  });
  const videoQueryRef = useRef<VideoPageQuery>(videoQuery);
  const imageTextQueryRef = useRef<GraphicPageQuery>(imageTextQuery);
  const articleQueryRef = useRef<ArticlePageQuery>(articleQuery);

  const markReady = useCallback((mod: ContentModule) => {
    setModuleReady((prev) => (prev[mod] ? prev : { ...prev, [mod]: true }));
  }, []);

  const loadVideos = useCallback(
    async (query: VideoPageQuery = videoQueryRef.current, force = false) => {
      if (!force && loadedRef.current.videos) return;
      if (loadingRef.current.videos) return;
      loadingRef.current.videos = true;
      setVideosLoading(true);
      videoQueryRef.current = query;
      try {
        const res = await api.getVideos(query);
        setVideos(res.items);
        setVideoTotal(res.total);
      } catch {
        // 加载失败时保留空列表，仍标记为已尝试，避免每次切换模块重复请求
      } finally {
        loadedRef.current.videos = true;
        markReady('videos');
        loadingRef.current.videos = false;
        setVideosLoading(false);
      }
    },
    [markReady]
  );

  const changeVideoQuery = useCallback(
    (query: VideoPageQuery) => {
      setVideoQuery(query);
      void loadVideos(query, true);
    },
    [loadVideos]
  );

  const loadImageTexts = useCallback(
    async (query: GraphicPageQuery = imageTextQueryRef.current, force = false) => {
      if (!force && loadedRef.current.imagetexts) return;
      if (loadingRef.current.imagetexts) return;
      loadingRef.current.imagetexts = true;
      setImagetextsLoading(true);
      imageTextQueryRef.current = query;
      try {
        const res = await api.getImageTexts(query);
        setImagetexts(res.items);
      } catch {
        // 同上
      } finally {
        loadedRef.current.imagetexts = true;
        markReady('imagetexts');
        loadingRef.current.imagetexts = false;
        setImagetextsLoading(false);
      }
    },
    [markReady]
  );

  const changeImageTextQuery = useCallback(
    (query: GraphicPageQuery) => {
      setImageTextQuery(query);
      void loadImageTexts(query, true);
    },
    [loadImageTexts]
  );

  const loadArticles = useCallback(
    async (query: ArticlePageQuery = articleQueryRef.current, force = false) => {
      if (!force && loadedRef.current.articles) return;
      if (loadingRef.current.articles) return;
      loadingRef.current.articles = true;
      setArticlesLoading(true);
      articleQueryRef.current = query;
      try {
        const res = await api.getArticles(query);
        setArticles(res.items);
      } catch {
        // 同上
      } finally {
        loadedRef.current.articles = true;
        markReady('articles');
        loadingRef.current.articles = false;
        setArticlesLoading(false);
      }
    },
    [markReady]
  );

  const changeArticleQuery = useCallback(
    (query: ArticlePageQuery) => {
      setArticleQuery(query);
      void loadArticles(query, true);
    },
    [loadArticles]
  );

  const loadModule = useCallback(
    (mod: ContentModule, force = false) => {
      if (mod === 'videos') return loadVideos(videoQueryRef.current, force);
      if (mod === 'imagetexts') return loadImageTexts(imageTextQueryRef.current, force);
      return loadArticles(articleQueryRef.current, force);
    },
    [loadVideos, loadImageTexts, loadArticles]
  );

  // 进入（含详情页）对应内容模块时才懒加载该模块数据；登录后生效
  useEffect(() => {
    if (!user) return;
    if (activeModule === 'videos') void loadVideos();
    else if (activeModule === 'imagetexts') void loadImageTexts();
    else if (activeModule === 'articles') void loadArticles();
  }, [user, activeModule, loadVideos, loadImageTexts, loadArticles]);

  // 首页「我发布的视频」数量用轻量分页接口统计，不再依赖当前列表页数据
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void api
      .getVideos({ current: 1, size: 1, createUser: user.id })
      .then((res) => {
        if (alive) setMyVideoCount(res.total);
      })
      .catch(() => {
        if (alive) setMyVideoCount(0);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // 首页「我发布的文章」数量单独统计，避免受列表筛选条件影响
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void api
      .countArticles({ createUser: user.id })
      .then((total) => {
        if (alive) setMyArticleCount(total);
      })
      .catch(() => {
        if (alive) setMyArticleCount(0);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // 分页后详情/编辑可能不在当前页，按 ID 补拉单条数据
  useEffect(() => {
    if (route.kind !== 'content' || route.module !== 'videos' || !route.id || route.action === 'new') {
      setVideoDetailLoading(false);
      return;
    }
    const id = route.id;
    if (videos.some((v) => v.id === id)) return;
    let alive = true;
    setVideoDetail(null);
    setVideoDetailLoading(true);
    void api
      .getVideo(id)
      .then((item) => {
        if (alive) setVideoDetail(item);
      })
      .catch(() => {
        if (alive) setVideoDetail(null);
      })
      .finally(() => {
        if (alive) setVideoDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [route, videos]);

  /** 用会话数据更新用户/菜单/权限，并按可访问模块校验恢复路由 */
  const applySession = useCallback(
    (
      session: { user: UserProfile; menus?: SnowyMenu[] },
      opts?: { forceDefault?: boolean }
    ) => {
      const nextModules = modulesFromMenu(session.menus || null);
      setUser(session.user);
      setModules(nextModules);
      // 保留原始菜单树供侧边栏树形渲染；登录异常回退时不覆盖已有缓存
      if (session.menus?.length) setMenuTree(session.menus);
      setPermissions(session.user.buttonCodeList || []);

      if (opts?.forceDefault) {
        go({ kind: 'module', module: resolveDefaultModule(nextModules, 'dashboard') }, true);
        return;
      }

      // 恢复上次路由：优先 URL hash / localStorage，但必须落在可访问模块内
      const restored = resolveInitialRoute('dashboard');
      const targetModule = routeModule(restored, 'dashboard');
      if (!nextModules.some((m) => m.key === targetModule)) {
        go({ kind: 'module', module: resolveDefaultModule(nextModules, 'dashboard') }, true);
      } else {
        go(restored, true);
      }
    },
    [go]
  );

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setBooting(false);
      return;
    }
    api
      .me()
      .then((res) => {
        applySession(res);
      })
      .catch(() => {
        // me() 走真实接口，鉴权失败会在此清除本地登录态
        setStoredToken(null);
      })
      .finally(() => {
        setBooting(false);
      });
  }, [applySession]);

  async function handleLoginSuccess(loggedInUser: UserProfile) {
    try {
      const meRes = await api.me();
      applySession(meRes, { forceDefault: true });
    } catch {
      // 菜单/用户接口异常时退回登录返回的用户信息
      applySession(
        { user: loggedInUser, menus: undefined },
        { forceDefault: true }
      );
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore logout error
    }
    setStoredToken(null);
    forgetModule();
    go({ kind: 'module', module: 'dashboard' }, true);
    setUser(null);
    setModules(FALLBACK_MODULES);
    setPermissions([]);
    setMenuTree([]);
    setExternalMenu(null);
  }

  function renderContentPage(activeRoute: Extract<AppRoute, { kind: 'content' }>): ReactNode {
    const { module, action, id, slide } = activeRoute;
    const back = () => goModule(module);
    // 保存/删除后只强制刷新当前模块
    const refresh = () => loadModule(module, true);

    // 模块不在可访问列表，或对应动作无权限时，拒绝渲染
    const permittedAction =
      action === 'new'
        ? 'Add'
        : action === 'edit'
          ? 'Edit'
          : action === 'delete'
            ? 'Delete'
            : 'Detail';
    if (
      !modules.some((m) => m.key === module) ||
      !hasModulePerm(module, permittedAction, permissions)
    ) {
      return <NoAccessPage onBack={() => goModule('dashboard')} />;
    }

    if (action === 'new') {
      if (module === 'videos') {
        return (
          <VideoEditorPage
            initialVideoFile={pendingVideoFile}
            onInitialFileConsumed={() => setPendingVideoFile(null)}
            onSaved={refresh}
            onBack={back}
          />
        );
      }
      if (module === 'imagetexts') {
        return (
          <ImageTextEditorPage
            initialImageFiles={pendingImageFiles}
            onInitialFilesConsumed={() => setPendingImageFiles(null)}
            onSaved={refresh}
            onBack={back}
          />
        );
      }
      return <ArticleEditorPage onSaved={refresh} onBack={back} />;
    }

    const video =
      module === 'videos' ? videos.find((v) => v.id === id) || videoDetail : undefined;
    const imageText =
      module === 'imagetexts' ? imagetexts.find((it) => it.id === id) : undefined;
    const article = module === 'articles' ? articles.find((a) => a.id === id) : undefined;
    const missing = !video && !imageText && !article;

    // 详情/编辑需要列表数据定位条目，模块尚未加载完成时先显示加载态
    if (missing && (videoDetailLoading || !moduleReady[module])) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#86868B]">
          <div className="w-8 h-8 rounded-full border-2 border-[#0071E3] border-t-transparent animate-spin" />
          <span className="text-[13px]">正在加载{CONTENT_NAMES[module]}...</span>
        </div>
      );
    }

    if (missing) return <PageNotFound label={CONTENT_NAMES[module]} onBack={back} />;

    if (action === 'view') {
      if (imageText) {
        return (
          <ImageViewPage
            item={imageText}
            slide={slide}
            onRefresh={refresh}
            onBack={back}
          />
        );
      }
      return <ArticleReaderPage item={article!} onRefresh={refresh} onBack={back} />;
    }

    if (action === 'edit') {
      if (video) {
        return <VideoEditorPage item={video} onSaved={refresh} onBack={back} />;
      }
      if (imageText) {
        return <ImageTextEditorPage item={imageText} onSaved={refresh} onBack={back} />;
      }
      return <ArticleEditorPage item={article!} onSaved={refresh} onBack={back} />;
    }

    const itemTitle = video?.title || imageText?.title || article?.title || '';
    return (
      <DeleteConfirmPage
        title={`确认删除该${CONTENT_NAMES[module]}？`}
        itemTitle={itemTitle}
        description={
          video
            ? '此操作不可撤销，视频记录、封面图与视频源文件将一并永久删除。'
            : article
              ? '此操作不可撤销，文章、封面图以及正文中的图片和视频资源将一并永久删除。'
              : '此操作不可撤销，内容将从列表中永久移除。'
        }
        onBack={back}
        onConfirm={async () => {
          if (video) {
            await api.deleteVideo(video.id);
            // 视频记录删除成功后，一并清理封面与视频源文件，避免留下孤儿文件
            void deleteFilesByUrls([video.videoUrl, video.coverUrl]);
          } else if (imageText) await api.deleteImageText(imageText.id);
          else if (article) {
            const resourceUrls = [article.coverUrl, ...resourceUrlsInHtml(article.content)];
            await api.deleteArticle(article.id);
            void deleteFilesByUrls(resourceUrls);
          }
          await refresh();
        }}
      />
    );
  }

  if (booting) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#0071E3] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const headerTitle = externalMenu
    ? externalMenu.meta?.title || externalMenu.title || '菜单详情'
    : route.kind === 'content'
      ? `${ACTION_NAMES[route.action]}${CONTENT_NAMES[route.module]}`
      : route.kind === 'quick'
        ? '快速创建'
        : modules.find((m) => m.key === route.module)?.label || MODULE_TITLES[route.module];

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex text-[#1D1D1F] relative">
      <AppToast />
      <Sidebar
        menuTree={menuTree}
        activeModule={activeModule}
        activeMenuId={externalMenu?.id || null}
        onSelectModule={goModule}
        onSelectMenu={handleSelectMenu}
        user={user}
        onLogout={handleLogout}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div
        className="relative flex-1 min-w-0 flex flex-col h-screen min-h-0"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleContentDragDrop}
      >
        {contentDropActive && (
          <div className="pointer-events-none absolute inset-0 z-[9997] bg-[#0071E3]/8 backdrop-blur-[1px]" />
        )}
        {/* Top Bar Contract: Breadcrumb on Left — Clean Quick Nav — 1 Primary Action on Right */}
        <header className="sticky top-0 z-30 h-16 bg-[#F5F5F7]/85 backdrop-blur-xl border-b border-[#E5E5EA] px-4 sm:px-8 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="打开导航菜单"
              className="lg:hidden w-9 h-9 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#1D1D1F] shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-[14px] whitespace-nowrap shrink-0">
              <span className="text-[#86868B] hidden sm:inline">工作台</span>
              <span className="text-[#C7C7CC] hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F]">
                {headerTitle}
              </h1>
            </div>
          </div>

        </header>

        <main
          className={`flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden px-4 sm:px-8 py-6 ${
            route.kind === 'content'
              ? 'lg:flex lg:flex-col'
              : ''
          }`}
        >
          {externalMenu ? (
            <ExternalMenuView
              node={externalMenu}
              onBack={() => goModule('dashboard')}
            />
          ) : moduleBlocked ? (
            <NoAccessPage onBack={() => goModule('dashboard')} />
          ) : route.kind === 'quick' ? (
            <QuickCreatePage
              onSelect={(module) => goContent(module, 'new')}
              onBack={() => goModule('dashboard')}
            />
          ) : route.kind === 'content' ? (
            renderContentPage(route)
          ) : route.module === 'dashboard' ? (
            <DashboardView
              onNavigate={goModule}
              permissions={permissions}
              myCounts={{
                videos: myVideoCount,
                imagetexts: imagetexts.filter((i) => i.authorId === user.id).length,
                articles: myArticleCount,
              }}
            />
          ) : route.module === 'videos' ? (
            <VideoManagerView
              videos={videos}
              total={videoTotal}
              query={videoQuery}
              loading={videosLoading}
              onQueryChange={changeVideoQuery}
              onRefresh={() => loadModule('videos', true)}
              onOpen={(action, id) => goContent('videos', action, id)}
              permissions={permissions}
            />
          ) : route.module === 'imagetexts' ? (
            <ImageTextManagerView
              items={imagetexts}
              query={imageTextQuery}
              loading={imagetextsLoading}
              onQueryChange={changeImageTextQuery}
              onRefresh={() => loadModule('imagetexts', true)}
              onOpen={(action, id, slide) => goContent('imagetexts', action, id, slide)}
              permissions={permissions}
            />
          ) : route.module === 'articles' ? (
            <ArticleManagerView
              articles={articles}
              query={articleQuery}
              loading={articlesLoading}
              onQueryChange={changeArticleQuery}
              onRefresh={() => loadModule('articles', true)}
              onOpen={(action, id) => goContent('articles', action, id)}
              permissions={permissions}
            />
          ) : route.module === 'category' ? (
            <CategoryView permissions={permissions} />
          ) : route.module === 'messages' ? (
            <MessageView permissions={permissions} />
          ) : route.module === 'comments' ? (
            <CommentView permissions={permissions} />
          ) : route.module === 'files' ? (
            <FileCenterView />
          ) : route.module === 'materials' ? (
            <MaterialCenterView permissions={permissions} />
          ) : route.module === 'assetResource' ? (
            <AssetResourceView />
          ) : route.module === 'config' ? (
            <ConfigView />
          ) : (
            <PersonalCenterView
              user={user}
              onUserUpdated={(updated) => setUser(updated)}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {batchFiles && (
        <VideoBatchUploadModal
          files={batchFiles}
          onClose={() => setBatchFiles(null)}
          onUploaded={() => loadModule('videos', true)}
        />
      )}
    </div>
  );
}
