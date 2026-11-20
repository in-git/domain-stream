import { useCallback, useEffect, useState } from 'react';
import type { SectionId } from './data/content';
import { startVisitorTracking, trackPageView } from './lib/visitor';
import { LoginView } from './views/auth/LoginView';
import { RegisterView } from './views/auth/RegisterView';
import { CallbackView } from './views/auth/CallbackView';
import { ProfilePage } from './views/profile/ProfilePage';
import { isSectionId, LAST_SECTION_KEY } from './views/constants';
import { usePersistentState } from './views/usePersistentState';
import { useUserSession } from './views/useUserSession';
import { usePortalData } from './views/usePortalData';
import { usePersistentPlayer } from './views/usePersistentPlayer';
import { PortalShell } from './views/shell/PortalShell';

/** 应用入口：只负责组合 hooks、路由分发与懒加载触发，视图细节在 views/ 下 */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeSection, setActiveSection] = usePersistentState<SectionId>(
    LAST_SECTION_KEY,
    'videos',
    isSectionId
  );
  const [searchQuery, setSearchQuery] = useState('');
  /** 移动端独立搜索模块是否展开 */
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const session = useUserSession();
  const data = usePortalData(session.profile.name, activeSection);
  const player = usePersistentPlayer();

  /* 进入某板块时才拉取该板块数据，已加载板块不再重复请求 */
  useEffect(() => {
    if (activeSection === 'profile' || data.loadedSections[activeSection]) return;
    void data.loadSection(activeSection);
  }, [activeSection, data.loadedSections, data.loadSection]);

  // 启动访客在线追踪（WebSocket 心跳 + 关键事件上报）
  useEffect(() => startVisitorTracking(), []);

  // 深色模式同步到根节点，供全局样式生效
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', session.isDark);
  }, [session.isDark]);

  const handleSelectSection = useCallback(
    (section: SectionId) => {
      setActiveSection(section);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const pageType =
        section === 'videos' ? 'VIDEO'
          : section === 'articles' ? 'ARTICLE'
            : section === 'gallery' ? 'GRAPHIC'
              : section === 'messages' ? 'MESSAGE'
                : 'PROFILE';
      trackPageView(pageType);
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
