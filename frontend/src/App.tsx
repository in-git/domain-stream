import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { startVisitorTracking, trackPageView } from './lib/visitor';
import { loadSystemInfo, useSystemInfo, useSystemInfoLoaded } from './lib/systemInfo';
import { LoginView } from './views/auth/LoginView';
import { RegisterView } from './views/auth/RegisterView';
import { CallbackView } from './views/auth/CallbackView';
import { navigate } from './lib/router';
import {
  isAnySectionId,
  isSectionId,
  LAST_SECTION_KEY,
  usePersistentState,
  useUserSession,
  usePortalData,
  usePersistentPlayer,
} from './views/app';
import { PortalShell } from './views/shell/PortalShell';
import { parseNav } from './views/shell/navConfig';

/** 应用入口：只负责组合 hooks、路由分发与懒加载触发，视图细节在 views/ 下 */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  // 当前选中的模块 key：内置板块为固定 key，自定义模块为 CMS 生成的 moduleKey
  const [activeSection, setActiveSection] = usePersistentState<string>(
    LAST_SECTION_KEY,
    'videos',
    isAnySectionId
  );
  const [searchQuery, setSearchQuery] = useState('');
  /** 移动端独立搜索模块是否展开 */
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [settingsProfileToken, setSettingsProfileToken] = useState(0);

  const session = useUserSession();
  const { config } = useSystemInfo();
  const configLoaded = useSystemInfoLoaded();
  const data = usePortalData(session.profile.name, activeSection, session.likeCounts);
  const { loadSection } = data;
  const player = usePersistentPlayer();

  /* 按需加载：只拉取当前进入的板块数据，设置页不再预加载视频/文章/图文。
     自定义模块没有数据源，退化为拉取视频；留言墙每次进入都重新拉取。 */
  useEffect(() => {
    // 留言墙每次进入都重新拉取，避免切回时展示过期留言
    if (activeSection === 'messages') {
      void data.loadSection('messages', true);
      return;
    }
    // 自定义模块没有数据源，但整页刷新时仍要保证有内容板块被加载，否则页面空白
    void data.loadSection(isSectionId(activeSection) ? activeSection : 'videos');
    // loadSection 内部有 loading 防重入，依赖只随 activeSection 变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // /profile 统一落到设置中心的个人中心分类
  useEffect(() => {
    if (session.route.kind !== 'profile') return;
    setActiveSection('settings');
    setSettingsProfileToken((value) => value + 1);
    navigate('/', true);
  }, [session.route.kind, setActiveSection]);

  // 应用启动时拉取系统基础信息（网页标题 / 开屏文本）
  useEffect(() => {
    void loadSystemInfo();
  }, []);

  // 本地记住的 moduleKey 若已被 CMS 删除或隐藏，回退到当前可用的内置模块
  useEffect(() => {
    if (!configLoaded) return;
    const navItems = parseNav(config.navItems);
    const availableKeys = navItems.map((item) => item.moduleKey);
    if (availableKeys.includes(activeSection)) return;
    const fallback =
      navItems.find((item) => item.moduleType === 'builtin')?.moduleKey ||
      availableKeys[0] ||
      'videos';
    setActiveSection(fallback);
  }, [configLoaded, config.navItems, activeSection, setActiveSection]);

  // 启动访客在线追踪（WebSocket 心跳 + 关键事件上报）
  useEffect(() => startVisitorTracking(), []);

  // 深色模式同步到根节点，供全局样式生效
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', session.isDark);
  }, [session.isDark]);

  const handleSelectSection = useCallback(
    (section: string, force = false) => {
      // 侧栏点击强制刷新对应板块；个人中心与自定义模块没有独立内容接口
      if (force && isSectionId(section)) {
        void loadSection(section, true);
      }
      setActiveSection(section);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // 自定义模块没有专属埋点类型，跳过上报
      const pageType =
        section === 'videos' ? 'VIDEO'
          : section === 'articles' ? 'ARTICLE'
            : section === 'gallery' ? 'GRAPHIC'
              : section === 'messages' ? 'MESSAGE'
                : section === 'profile' ? 'PROFILE'
                  : null;
      if (pageType) trackPageView(pageType);
    },
    [loadSection, setActiveSection]
  );

  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  // 登录不再占用整页路由：/login 时保留原页面，在其上层叠加登录弹窗
  return (
    <>
      {session.route.kind === 'register' ? (
        <RegisterView />
      ) : session.route.kind === 'callback' ? (
        <CallbackView platform={session.route.platform || ''} onSuccess={session.handleAuthSuccess} />
      ) : (
        <PortalShell
          showSplash={showSplash}
          onSplashComplete={handleSplashComplete}
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          isSearchOpen={isSearchOpen}
          onOpenSearch={() => setIsSearchOpen(true)}
          onCloseSearch={() => setIsSearchOpen(false)}
          session={session}
          data={data}
          player={player}
          settingsProfileToken={settingsProfileToken}
        />
      )}

      {session.route.kind === 'login' && (
        <LoginView onSuccess={session.handleAuthSuccess} onClose={session.closeLogin} />
      )}

      {/* 退出登录二次确认弹窗，挂到 body 顶层确保盖过所有页面与浮层 */}
      {session.logoutConfirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm"
            onClick={session.closeLogoutConfirm}
          >
            <div
              className="w-full max-w-[320px] rounded-app bg-app-bg p-5 text-center shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="text-[16px] font-semibold text-app-text">
                退出登录
              </h2>
              <p className="mt-2 text-[13px] text-app-muted">
                确定要退出当前账号吗？
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={session.closeLogoutConfirm}
                  className="flex-1 rounded-app bg-app-surface py-2 text-[13px] font-medium text-app-text dark:bg-app-surface dark:text-app-text"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={session.doLogout}
                  className="flex-1 rounded-app bg-[#FF3B30] py-2 text-[13px] font-medium text-white"
                >
                  退出
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
