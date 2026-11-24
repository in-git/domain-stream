import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { api, getStoredToken, setStoredToken } from './lib/api.ts';
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
import { AppToast } from './components/AppToast.tsx';
import { DeleteConfirmPage } from './components/DeleteConfirmPage.tsx';
import { QuickCreatePage } from './components/QuickCreatePage.tsx';
import { UploadQueuePanel } from './components/UploadQueuePanel.tsx';
import { NoAccessPage, PageNotFound } from './components/PageShell.tsx';
import { LoginView } from './views/login/LoginView.tsx';
import { DashboardView } from './views/dashboard/DashboardView.tsx';
import { VideoManagerView } from './views/biz/video/VideoManagerView.tsx';
import { ImageTextManagerView } from './views/biz/imagetext/ImageTextManagerView.tsx';
import { ArticleManagerView } from './views/biz/article/ArticleManagerView.tsx';
import { PersonalCenterView } from './views/profile/PersonalCenterView.tsx';
import { ExternalMenuView } from './views/system/ExternalMenuView.tsx';
import { VideoEditorPage } from './views/biz/video/VideoPages.tsx';
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
  // 列表路由越权拦截（如手动改 hash 到无权限模块）
  const moduleBlocked =
    route.kind === 'module' && !modules.some((m) => m.key === route.module);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [imagetexts, setImagetexts] = useState<ImageTextItem[]>([]);
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

  const markReady = useCallback((mod: ContentModule) => {
    setModuleReady((prev) => (prev[mod] ? prev : { ...prev, [mod]: true }));
  }, []);

  const loadVideos = useCallback(async (force = false) => {
    if (!force && loadedRef.current.videos) return;
    if (loadingRef.current.videos) return;
    loadingRef.current.videos = true;
    try {
      const res = await api.getVideos();
      setVideos(res.items);
    } catch {
      // 加载失败时保留空列表，仍标记为已尝试，避免每次切换模块重复请求
    } finally {
      loadedRef.current.videos = true;
      markReady('videos');
      loadingRef.current.videos = false;
    }
  }, [markReady]);

  const loadImageTexts = useCallback(async (force = false) => {
    if (!force && loadedRef.current.imagetexts) return;
    if (loadingRef.current.imagetexts) return;
    loadingRef.current.imagetexts = true;
    try {
      const res = await api.getImageTexts();
      setImagetexts(res.items);
    } catch {
      // 同上
    } finally {
      loadedRef.current.imagetexts = true;
      markReady('imagetexts');
      loadingRef.current.imagetexts = false;
    }
  }, [markReady]);

  const loadArticles = useCallback(async (force = false) => {
    if (!force && loadedRef.current.articles) return;
    if (loadingRef.current.articles) return;
    loadingRef.current.articles = true;
    try {
      const res = await api.getArticles();
      setArticles(res.items);
    } catch {
      // 同上
    } finally {
      loadedRef.current.articles = true;
      markReady('articles');
      loadingRef.current.articles = false;
    }
  }, [markReady]);

  const loadModule = useCallback(
    (mod: ContentModule, force = false) => {
      if (mod === 'videos') return loadVideos(force);
      if (mod === 'imagetexts') return loadImageTexts(force);
      return loadArticles(force);
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
        return <VideoEditorPage onSaved={refresh} onBack={back} />;
      }
      if (module === 'imagetexts') {
        return <ImageTextEditorPage onSaved={refresh} onBack={back} />;
      }
      return <ArticleEditorPage onSaved={refresh} onBack={back} />;
    }

    const video = module === 'videos' ? videos.find((v) => v.id === id) : undefined;
    const imageText =
      module === 'imagetexts' ? imagetexts.find((it) => it.id === id) : undefined;
    const article = module === 'articles' ? articles.find((a) => a.id === id) : undefined;
    const missing = !video && !imageText && !article;

    // 详情/编辑需要列表数据定位条目，模块尚未加载完成时先显示加载态
    if (missing && !moduleReady[module]) {
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
    <div className="min-h-screen bg-[#F5F5F7] flex text-[#1D1D1F]">
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

      <div className="flex-1 min-w-0 flex flex-col h-screen min-h-0">
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
                videos: videos.filter((v) => v.authorId === user.id).length,
                imagetexts: imagetexts.filter((i) => i.authorId === user.id).length,
                articles: articles.filter((a) => a.authorId === user.id).length,
              }}
            />
          ) : route.module === 'videos' ? (
            <VideoManagerView
              videos={videos}
              onRefresh={() => loadModule('videos', true)}
              onOpen={(action, id) => goContent('videos', action, id)}
              permissions={permissions}
            />
          ) : route.module === 'imagetexts' ? (
            <ImageTextManagerView
              items={imagetexts}
              onRefresh={() => loadModule('imagetexts', true)}
              onOpen={(action, id, slide) => goContent('imagetexts', action, id, slide)}
              permissions={permissions}
            />
          ) : route.module === 'articles' ? (
            <ArticleManagerView
              articles={articles}
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
            <AssetResourceView permissions={permissions} />
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

      {/* 全局后台上传任务面板：上传期间用户可继续操作其它内容 */}
      <UploadQueuePanel />
    </div>
  );
}
