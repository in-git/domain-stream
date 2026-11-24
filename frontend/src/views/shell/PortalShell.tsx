import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { registerCommentLogin } from '../../lib/commentLogin.ts';
import { publicFileUrl, useSystemInfo } from '../../lib/systemInfo';
import { SplashScreen } from '../../components/SplashScreen';
import { BUILTIN_SECTIONS, LeftSidebar } from './LeftSidebar';
import { isSectionId } from '../app';
import { SectionPlaceholder } from './SectionPlaceholder';
import { MainHeader } from './MainHeader';
import { MobileTabBar } from './MobileTabBar';
import { SearchOverlay } from '../search/SearchOverlay';
import type { useUserSession, usePortalData, usePersistentPlayer } from '../app';
import { VideosSection } from '../videos/VideosSection';
import { ArticlesSection } from '../articles/ArticlesSection';
import { GallerySection } from '../gallery/GallerySection';
import { MessagesSection } from '../messages/MessagesSection';
import { ProfileSection } from '../profile/ProfileSection';

type UserSession = ReturnType<typeof useUserSession>;
type PortalData = ReturnType<typeof usePortalData>;
type PersistentPlayer = ReturnType<typeof usePersistentPlayer>;

interface PortalShellProps {
  showSplash: boolean;
  onSplashComplete: () => void;
  activeSection: string;
  onSelectSection: (section: string) => void;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  isSearchOpen: boolean;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  session: UserSession;
  data: PortalData;
  player: PersistentPlayer;
}

/** 门户主壳：导航、搜索、 splash，以及按板块切换的内容区 */
export function PortalShell({
  showSplash,
  onSplashComplete,
  activeSection,
  onSelectSection,
  searchQuery,
  onChangeSearch,
  isSearchOpen,
  onOpenSearch,
  onCloseSearch,
  session,
  data,
  player,
}: PortalShellProps) {
  // 搜索范围只接受内置板块；自定义模块没有专属数据，退化为搜索全部内容
  const searchSection = isSectionId(activeSection) ? activeSection : 'profile';
  /** 视频首页的视图模式，由顶栏按钮与视频页内部共用 */
  const [videoViewMode, setVideoViewMode] = useState<'feed' | 'grid'>('feed');
  /** 搜索结果点击文章时，交给文章板块打开同一个阅读器 */
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const {
    isDark,
    toggleTheme,
    isLoggedIn,
    currentUserId,
    accountEmail,
    userInfo,
    profile,
    setProfile,
    savedIds,
    toggleFavorite,
    likedIds,
    toggleLike,
    handleLogout,
    goLogin,
    goRegister,
    goProfile,
  } = session;
  const {
    videos,
    articles,
    photos,
    messages,
    replies,
    videoCategories,
    videoCategory,
    loadVideosByCategory,
    articleCategories,
    graphicCategories,
    loadingMap,
    loadedSections,
    errors,
    loadSection,
    addMessage,
    addReply,
  } = data;
  const {
    persistentVideo,
    setPersistentVideo,
    isMobileViewport,
    persistentMuted,
    persistentRate,
    videoProgress,
    saveVideoProgress,
    handlePlayVideo,
  } = player;

  // 评论区统一复用外壳的登录弹窗，避免各内容组件层层透传 goLogin
  useEffect(() => {
    registerCommentLogin(goLogin);
  }, [goLogin]);

  // 视图切换界面保持现状：搜索时切到卡片模式，点卡片条上的按钮或清空搜索后回到主视图
  useEffect(() => {
    if (activeSection !== 'videos') return;
    if (searchQuery.trim()) {
      setVideoViewMode('grid');
    } else if (!isMobileViewport) {
      setVideoViewMode('feed');
    }
  }, [isMobileViewport, activeSection, searchQuery]);

  /* 当前板块若不在内置列表里（CMS 新增的自定义模块），退化为占位页 */
  const { config } = useSystemInfo();
  const isCustomSection = !BUILTIN_SECTIONS.includes(activeSection);
  const customNavItem = useMemo(() => {
    if (!isCustomSection) return null;
    try {
      const list: unknown = JSON.parse(config.navItems || '[]');
      if (!Array.isArray(list)) return null;
      const row = list.find(
        (entry): entry is Record<string, unknown> =>
          !!entry && typeof entry === 'object' && String((entry as Record<string, unknown>).id) === activeSection
      );
      if (!row) return null;
      return {
        label: String(row.label ?? activeSection).slice(0, 4) || activeSection,
        iconUrl: publicFileUrl(String(row.iconUrl ?? '')),
      };
    } catch {
      return null;
    }
  }, [config.navItems, activeSection, isCustomSection]);

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`min-h-screen flex text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors duration-300 ease-out ${
          activeSection === 'videos' && isMobileViewport
            ? 'bg-black'
            : 'bg-[#FBFBFD] dark:bg-[#000000]'
        }`}
      >
        <AnimatePresence>
          {showSplash && <SplashScreen onComplete={onSplashComplete} />}
        </AnimatePresence>

        <LeftSidebar activeSection={activeSection} onSelectSection={onSelectSection} />

        <div className="flex-1 min-w-0 flex flex-col min-h-[100dvh] overflow-hidden">
          <MainHeader
            searchQuery={searchQuery}
            onChangeSearch={onChangeSearch}
            onOpenSearch={onOpenSearch}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            overlay={activeSection === 'videos' && isMobileViewport && videoViewMode === 'feed'}
            solidBlack={activeSection === 'videos' && isMobileViewport && videoViewMode === 'grid'}
            showViewToggle={activeSection === 'videos' && isMobileViewport}
            viewMode={videoViewMode}
            onToggleViewMode={() =>
              setVideoViewMode((mode) => (mode === 'feed' ? 'grid' : 'feed'))
            }
            account={{
              isLoggedIn,
              displayName: profile.name,
              avatarUrl: profile.avatar,
              onGoLogin: goLogin,
              onGoProfile: goProfile,
              onLogout: handleLogout,
            }}
          />

          {/* 移动端视频板块全出血：去掉左右留白与顶部间距，让播放区贴满容器 */}
          <main
            className={`flex-1 w-full  h-full ${
              activeSection === 'videos'
                ? 'px-0 pt-0 pb-0'
                : 'px-2.5 sm:px-3 md:px-4 lg:px-5 xl:px-6 2xl:px-8 pt-0 pb-0 md:pb-8'
            }`}
          >
            <VideosSection
              active={activeSection === 'videos'}
              loading={!loadedSections.videos && !!loadingMap.videos}
              error={errors.videos}
              videos={videos}
              categories={videoCategories}
              category={videoCategory}
              onCategoryChange={(c) => void loadVideosByCategory(c)}
              savedIds={savedIds}
              likedIds={likedIds}
              searchQuery={searchQuery}
              progressById={videoProgress}
              resumeVideoId={persistentVideo?.id}
              resumeMuted={persistentMuted}
              resumePlaybackRate={persistentRate}
              isMini={!!persistentVideo && !isMobileViewport}
              onRetry={() => void loadSection('videos')}
              onToggleSave={toggleFavorite}
              onToggleLike={toggleLike}
              onPlayVideo={handlePlayVideo}
              onSaveProgress={saveVideoProgress}
              onMiniClose={() => setPersistentVideo(null)}
              onMiniExpand={() => onSelectSection('videos')}
              viewMode={videoViewMode}
              onViewModeChange={setVideoViewMode}
            />

            <AnimatePresence mode="wait">
              {activeSection === 'articles' && (
                <motion.div
                  key="section-articles"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={SWIFTUI_SMOOTH}
                >
                  <ArticlesSection
                    articles={articles}
                    categories={articleCategories}
                    savedIds={savedIds}
                    likedIds={likedIds}
                    searchQuery={searchQuery}
                    loading={!!loadingMap.articles}
                    error={errors.articles}
                    onRetry={() => void loadSection('articles')}
                    onToggleSave={toggleFavorite}
                    onToggleLike={toggleLike}
                    externalSelectedId={selectedArticleId}
                    onClearExternalSelection={() => setSelectedArticleId(null)}
                  />
                </motion.div>
              )}

              {activeSection === 'gallery' && (
                <motion.div
                  key="section-gallery"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={SWIFTUI_SMOOTH}
                >
                  <GallerySection
                    photos={photos}
                    categories={graphicCategories}
                    savedIds={savedIds}
                    likedIds={likedIds}
                    searchQuery={searchQuery}
                    loading={!!loadingMap.gallery}
                    error={errors.gallery}
                    onRetry={() => void loadSection('gallery')}
                    onToggleSave={toggleFavorite}
                    onToggleLike={toggleLike}
                  />
                </motion.div>
              )}

              {activeSection === 'messages' && (
                <motion.div
                  key="section-messages"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={SWIFTUI_SMOOTH}
                >
                  <MessagesSection
                    messages={messages}
                    replies={replies}
                    likedIds={likedIds}
                    searchQuery={searchQuery}
                    isLoggedIn={isLoggedIn}
                    currentUser={{
                      name: isLoggedIn ? profile.name : '',
                      userId: isLoggedIn ? currentUserId : undefined,
                      email: isLoggedIn ? accountEmail : undefined,
                      avatar: isLoggedIn ? profile.avatar : undefined,
                    }}
                    loading={!!loadingMap.messages}
                    error={errors.messages}
                    onRetry={() => void loadSection('messages')}
                    onRequireLogin={goLogin}
                    onToggleLike={toggleLike}
                    onAddMessage={(message) => void addMessage(message)}
                    onAddReply={addReply}
                  />
                </motion.div>
              )}

              {activeSection === 'profile' && (
                <motion.div
                  key="section-profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={SWIFTUI_SMOOTH}
                >
                  <ProfileSection
                    isLoggedIn={isLoggedIn}
                    accountEmail={accountEmail}
                    profile={profile}
                    userInfo={userInfo}
                    onLogout={handleLogout}
                    onGoLogin={goLogin}
                    onGoRegister={goRegister}
                    onUpdateProfile={setProfile}
                    videos={videos}
                    articles={articles}
                    photos={photos}
                    savedIds={savedIds}
                    onToggleSave={toggleFavorite}
                    likedIds={likedIds}
                    onToggleLike={toggleLike}
                  />
                </motion.div>
              )}

              {/* 自定义模块占位页：后台已启用、客户端尚无对应页面 */}
              {isCustomSection && (
                <SectionPlaceholder
                  key={`section-custom-${activeSection}`}
                  label={customNavItem?.label || activeSection}
                  sectionId={activeSection}
                  iconUrl={customNavItem?.iconUrl}
                  onGoHome={() => onSelectSection('videos')}
                />
              )}
            </AnimatePresence>
          </main>
        </div>

        <MobileTabBar
          activeSection={activeSection}
          onSelectSection={onSelectSection}
          transparent={activeSection === 'videos'}
        />

        <AnimatePresence>
          {isSearchOpen && (
            <SearchOverlay
              section={searchSection}
              videos={videos}
              articles={articles}
              photos={photos}
              messages={messages}
              onClose={onCloseSearch}
              onOpenArticle={(articleId) => {
                setSelectedArticleId(articleId);
                onSelectSection('articles');
                onCloseSearch();
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
