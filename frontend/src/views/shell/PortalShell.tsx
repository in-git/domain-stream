import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useMemo } from 'react';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { publicFileUrl, useSystemInfo } from '../../lib/systemInfo';
import { SplashScreen } from '../../components/SplashScreen';
import { BUILTIN_SECTIONS, LeftSidebar } from './LeftSidebar';
import { SectionPlaceholder } from './SectionPlaceholder';
import { MainHeader } from './MainHeader';
import { MobileTabBar } from './MobileTabBar';
import { SearchOverlay } from '../search/SearchOverlay';
import type { useUserSession } from '../useUserSession';
import type { usePortalData } from '../usePortalData';
import type { usePersistentPlayer } from '../usePersistentPlayer';
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
    articleCategories,
    graphicCategories,
    loadingMap,
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
      <div className="min-h-screen flex bg-[#FBFBFD] text-[#1D1D1F] dark:bg-[#000000] dark:text-[#F5F5F7] transition-colors duration-300">
        <AnimatePresence>
          {showSplash && <SplashScreen onComplete={onSplashComplete} />}
        </AnimatePresence>

        <LeftSidebar activeSection={activeSection} onSelectSection={onSelectSection} />

        <div className="flex-1 min-w-0 flex flex-col min-h-[100dvh]">
          <MainHeader
            searchQuery={searchQuery}
            onChangeSearch={onChangeSearch}
            onOpenSearch={onOpenSearch}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            overlay={activeSection === 'videos' && isMobileViewport}
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
            className={`flex-1 w-full ${
              activeSection === 'videos'
                ? 'px-0 md:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-0 md:pt-6 pb-0 md:pb-8'
                : 'px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-4 sm:pt-6 pb-20 md:pb-8'
            }`}
          >
            <VideosSection
              active={activeSection === 'videos'}
              loading={!!loadingMap.videos}
              error={errors.videos}
              videos={videos}
              categories={videoCategories}
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
                    onPublished={() => void reloadGraphics()}
                    currentUserName={session.profile.name}
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
                    isDark={isDark}
                    onToggleTheme={toggleTheme}
                    onLogout={handleLogout}
                    onGoLogin={goLogin}
                    onGoRegister={goRegister}
                    onUpdateProfile={setProfile}
                    videos={videos}
                    articles={articles}
                    photos={photos}
                    savedIds={savedIds}
                    onToggleSave={toggleFavorite}
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
              section={activeSection}
              videos={videos}
              articles={articles}
              photos={photos}
              messages={messages}
              onClose={onCloseSearch}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
