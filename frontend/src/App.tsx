import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { startVisitorTracking, trackPageView } from './lib/visitor';
import { loadSystemInfo } from './lib/systemInfo';
import { LoginView } from './views/auth/LoginView';
import { RegisterView } from './views/auth/RegisterView';
import { CallbackView } from './views/auth/CallbackView';
import { ProfilePage } from './views/profile/ProfilePage';
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
  const data = usePortalData(session.profile.name, activeSection, session.likeCounts);
  const { loadSection } = data;
  const player = usePersistentPlayer();

  const isProfileBehindLogin =
    session.route.kind === 'login' && session.loginReturnPath === '/profile';
  const isProfileView = session.route.kind === 'profile' || isProfileBehindLogin;

  /* 每次切换到板块时都重新拉取该板块数据；个人中心的喜欢/收藏需要三类内容，
     进入个人中心时先把视频、文章、图文都加载好。自定义模块没有数据源，直接跳过。 */
  useEffect(() => {
    if (isProfileView) {
      (['videos', 'articles', 'gallery'] as const).forEach((section) =>
        void data.loadSection(section)
      );
      return;
    }
    // 自定义模块没有数据源，但整页刷新时仍要保证有内容板块被加载，否则页面空白
    void data.loadSection(isSectionId(activeSection) ? activeSection : 'videos');
    // loadSection 内部有 loading 防重入，依赖只随 activeSection / isProfileView 变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, isProfileView]);

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
      ) : isProfileView ? (
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
          likedIds={session.likedIds}
          onToggleLike={session.toggleLike}
        />
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
              className="w-full max-w-[320px] rounded-2xl bg-white p-5 text-center shadow-2xl dark:bg-[#1C1C1E]"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="text-[16px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                退出登录
              </h2>
              <p className="mt-2 text-[13px] text-[#6E6E73] dark:text-[#98989D]">
                确定要退出当前账号吗？
              </p>
              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={session.closeLogoutConfirm}
                  className="flex-1 rounded-xl bg-[#F2F2F7] py-2.5 text-[13px] font-medium text-[#1D1D1F] dark:bg-[#2C2C2E] dark:text-[#F5F5F7]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={session.doLogout}
                  className="flex-1 rounded-xl bg-[#FF3B30] py-2.5 text-[13px] font-medium text-white"
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
