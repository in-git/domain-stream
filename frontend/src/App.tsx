import { useCallback, useEffect, useState } from 'react';
import { startVisitorTracking, trackPageView } from './lib/visitor';
import { loadSystemInfo } from './lib/systemInfo';
import { LoginView } from './views/auth/LoginView';
import { RegisterView } from './views/auth/RegisterView';
import { CallbackView } from './views/auth/CallbackView';
import { ProfilePage } from './views/profile/ProfilePage';
import { isAnySectionId, isSectionId, LAST_SECTION_KEY } from './views/constants';
import { usePersistentState } from './views/usePersistentState';
import { useUserSession } from './views/useUserSession';
import { usePortalData } from './views/usePortalData';
import { usePersistentPlayer } from './views/usePersistentPlayer';
import { PortalShell } from './views/shell/PortalShell';

/** 应用入口：只负责组合 hooks、路由分发与懒加载触发，视图细节在 views/ 下 */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  // 板块 id 放宽为 string：CMS 可新增自定义模块，这里需要能记住并恢复它
  const [activeSection, setActiveSection] = usePersistentState<string>(
    LAST_SECTION_KEY,
    'videos',
    isAnySectionId
  );
  const [searchQuery, setSearchQuery] = useState('');
  /** 移动端独立搜索模块是否展开 */
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const session = useUserSession();
  const data = usePortalData(session.profile.name, activeSection);
  const player = usePersistentPlayer();

  /* 每次切换到板块时都重新拉取该板块数据，保证内容是最新的；
     自定义模块没有数据源，直接跳过，避免无意义请求 */
  useEffect(() => {
    if (activeSection === 'profile') return;
    if (!isSectionId(activeSection)) return;
    void data.loadSection(activeSection);
    // loadSection 内部有 loading 防重入，依赖只随 activeSection 变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // 应用启动时拉取系统基础信息（网页标题 / 开屏文本）
  useEffect(() => {
    void loadSystemInfo();
  }, []);

  // 启动访客在线追踪（WebSocket 心跳 + 关键事件上报）
  useEffect(() => startVisitorTracking(), []);

  // 深色模式同步到根节点，供全局样式生效
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', session.isDark);
  }, [session.isDark]);

  const handleSelectSection = useCallback(
    (section: string) => {
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
    [setActiveSection]
  );

  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  if (session.route.kind === 'login') {
    return <LoginView onSuccess={session.handleAuthSuccess} />;
  }
  if (session.route.kind === 'register') {
    return <RegisterView />;
  }
  if (session.route.kind === 'callback') {
    return (
      <CallbackView platform={session.route.platform || ''} onSuccess={session.handleAuthSuccess} />
    );
  }
  if (session.route.kind === 'profile') {
    return (
      <ProfilePage
        isLoggedIn={session.isLoggedIn}
        accountEmail={session.accountEmail}
        profile={session.profile}
        userInfo={session.userInfo}
        isDark={session.isDark}
        onToggleTheme={session.toggleTheme}
        onLogout={session.handleLogout}
        onGoLogin={session.goLogin}
        onGoRegister={session.goRegister}
        onUpdateProfile={session.setProfile}
        videos={data.videos}
        articles={data.articles}
        photos={data.photos}
        savedIds={session.savedIds}
        onToggleSave={session.toggleFavorite}
      />
    );
  }

  return (
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
    />
  );
}
