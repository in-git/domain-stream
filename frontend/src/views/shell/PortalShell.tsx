import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { registerCommentLogin } from '../../lib/commentLogin.ts';
import { publicFileUrl, useSystemInfo } from '../../lib/systemInfo';
import { SplashScreen } from '../../components/SplashScreen';
import { BUILTIN_SECTIONS, LeftSidebar } from './LeftSidebar';
import { isSectionId } from '../app';
import { parseNav } from './navConfig';
import { SectionPlaceholder } from './SectionPlaceholder';
import { MainHeader } from './MainHeader';
import { MobileTabBar } from './MobileTabBar';
import { SearchOverlay } from '../search/SearchOverlay';
import type { useUserSession, usePortalData, usePersistentPlayer } from '../app';
import { VideosSection } from '../videos/VideosSection';
import { ArticlesSection } from '../articles/ArticlesSection';
import { GallerySection } from '../gallery/GallerySection';
import { MessagesSection } from '../messages/MessagesSection';
import { ProfilePCView } from '../profile/ProfilePCView';
import { ProfileMobileView } from '../profile/ProfileMobileView';
import { useProfileForms } from '../profile/ProfileForms';
import { SettingsSection } from '../settings/SettingsSection';
import { SettingsMobileSection } from '../settings/SettingsMobileSection';

type UserSession = ReturnType<typeof useUserSession>;
type PortalData = ReturnType<typeof usePortalData>;
type PersistentPlayer = ReturnType<typeof usePersistentPlayer>;

interface PortalShellProps {
  showSplash: boolean;
  onSplashComplete: () => void;
  activeSection: string;
  onSelectSection: (section: string, force?: boolean) => void;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  isSearchOpen: boolean;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  session: UserSession;
  data: PortalData;
  player: PersistentPlayer;
  /** 个人中心入口触发计数，用于让设置页回到个人中心分类 */
  settingsProfileToken: number;
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
  settingsProfileToken,
}: PortalShellProps) {
  // 搜索范围只接受内置板块；自定义模块没有专属数据，退化为搜索全部内容
  const searchSection = isSectionId(activeSection) ? activeSection : 'profile';
  /** 视频首页的视图模式，由顶栏按钮与视频页内部共用 */
  const [videoViewMode, setVideoViewMode] = useState<'feed' | 'grid'>('feed');
  /** PC 沉浸播放列表侧栏开关：分类条在顶栏，侧栏在视频区，状态需提升到共同父级 */
  const [videoPlaylistOpen, setVideoPlaylistOpen] = useState(false);
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
    videoLoadingMore,
    videoHasMore,
    loadMoreVideos,
    articleCategories,
    graphicCategories,
    graphicCategory,
    loadGraphicsByCategory,
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

  const profileForm = useProfileForms(profile, setProfile);

  // PC 个人中心独立组件
  const profileContent = (
    <ProfilePCView
      isLoggedIn={isLoggedIn}
      profile={profile}
      userInfo={userInfo}
      likedCount={likedIds.length}
      savedCount={savedIds.length}
      onGoLogin={goLogin}
      onGoRegister={goRegister}
      onLogout={handleLogout}
      onUpdateProfile={setProfile}
    />
  );

  // 移动端个人中心独立组件，嵌入设置页
  const profileContentMobile = (
    <ProfileMobileView
      isLoggedIn={isLoggedIn}
      profile={profile}
      userInfo={userInfo}
      form={profileForm}
      onGoLogin={goLogin}
      onGoRegister={goRegister}
      onLogout={handleLogout}
    />
  );

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

  /* 当前板块按 moduleKey 找配置；moduleType 为 placeholder 时显示占位页 */
  const { config } = useSystemInfo();
  const navItems = useMemo(() => parseNav(config.navItems), [config.navItems]);
  const activeNavItem = useMemo(
    () => navItems.find((item) => item.moduleKey === activeSection) ?? null,
    [navItems, activeSection]
  );
  const isCustomSection = activeNavItem
    ? activeNavItem.moduleType === 'placeholder'
    : !BUILTIN_SECTIONS.includes(activeSection);
  const customNavItem = useMemo(() => {
    if (!isCustomSection || !activeNavItem) return null;
    return {
      label: activeNavItem.label,
      iconUrl: publicFileUrl(activeNavItem.iconUrl || ''),
    };
  }, [activeNavItem, isCustomSection]);

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
          {!(isMobileViewport && activeSection === 'settings') && (
            <MainHeader
              searchQuery={searchQuery}
              onChangeSearch={onChangeSearch}
              onOpenSearch={onOpenSearch}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              overlay={activeSection === 'videos' && isMobileViewport && videoViewMode === 'feed'}
              solidBlack={activeSection === 'videos' && isMobileViewport && videoViewMode === 'grid'}
              showViewToggle={activeSection === 'videos' && isMobileViewport}
              pcImmersive={activeSection === 'videos' && !isMobileViewport && videoViewMode === 'feed'}
              viewMode={videoViewMode}
              onToggleViewMode={() =>
                setVideoViewMode((mode) => (mode === 'feed' ? 'grid' : 'feed'))
              }
              feedCategories={videoCategories}
              feedCategory={videoCategory}
              onFeedCategoryChange={(c) => void loadVideosByCategory(c)}
              playlistOpen={videoPlaylistOpen}
              onTogglePlaylist={() => setVideoPlaylistOpen((v) => !v)}
              account={{
                isLoggedIn,
                displayName: profile.name,
                avatarUrl: profile.avatar,
                onGoLogin: goLogin,
                onGoProfile: session.goProfile,
                onLogout: handleLogout,
              }}
            />
          )}

          {/* 移动端视频板块全出血：去掉左右留白与顶部间距，让播放区贴满容器 */}
          <main className="flex-1 w-full h-full">
            <VideosSection
              active={activeSection === 'videos'}
              loading={!loadedSections.videos && !!loadingMap.videos}
              error={errors.videos}
              videos={videos}
              categories={videoCategories}
              category={videoCategory}
              onCategoryChange={(c) => void loadVideosByCategory(c)}
              hasMoreVideos={videoHasMore}
              loadingMoreVideos={videoLoadingMore}
              onLoadMoreVideos={() => void loadMoreVideos()}
              savedIds={savedIds}
              likedIds={likedIds}
              searchQuery={searchQuery}
              progressById={videoProgress}
              resumeVideoId={persistentVideo?.id}
              resumeMuted={persistentMuted}
              resumePlaybackRate={persistentRate}
              isMini={!!persistentVideo && !isMobileViewport}
              onRetry={() => void loadSection('videos', true)}
              onToggleSave={toggleFavorite}
              onToggleLike={toggleLike}
              onPlayVideo={handlePlayVideo}
              onSaveProgress={saveVideoProgress}
              onMiniClose={() => setPersistentVideo(null)}
              onMiniExpand={() => onSelectSection('videos')}
              viewMode={videoViewMode}
              onViewModeChange={setVideoViewMode}
              headerFloating={
                activeSection === 'videos' && !isMobileViewport && videoViewMode === 'feed'
              }
              playlistOpen={videoPlaylistOpen}
              onClosePlaylist={() => setVideoPlaylistOpen(false)}
            />

            <AnimatePresence mode="wait">
              {activeSection === 'articles' && (
                <motion.div
                  key="section-articles"
                  className="px-2 sm:px-3 md:px-4 lg:px-5 xl:px-6 2xl:px-8 md:pb-8"
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
                    onRetry={() => void loadSection('articles', true)}
                    onRefresh={() => void loadSection('articles', true)}
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
                  className="px-2 sm:px-3 md:px-4 lg:px-5 xl:px-6 2xl:px-8 md:pb-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={SWIFTUI_SMOOTH}
                >
                  <GallerySection
                    photos={photos}
                    categories={graphicCategories}
                    category={graphicCategory}
                    onCategoryChange={(c) => void loadGraphicsByCategory(c)}
                    savedIds={savedIds}
                    likedIds={likedIds}
                    searchQuery={searchQuery}
                    loading={!!loadingMap.gallery}
                    error={errors.gallery}
                    onRetry={() => void loadSection('gallery', true)}
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
                    onRetry={() => void loadSection('messages', true)}
                    onRequireLogin={goLogin}
                    onToggleLike={toggleLike}
                    onAddMessage={(message) => void addMessage(message)}
                    onAddReply={addReply}
                  />
                </motion.div>
              )}

              {activeSection === 'settings' &&
                (isMobileViewport ? (
                  <SettingsMobileSection
                    profileContent={profileContentMobile}
                    profileFocusToken={settingsProfileToken}
                    profileName={profile.name}
                    profileHandle={profile.handle}
                    profileBio={profile.bio}
                    profileAvatar={profile.avatar}
                    onOpenEditProfile={profileForm.openEditModal}
                    videos={videos}
                    articles={articles}
                    photos={photos}
                    likedIds={likedIds}
                    savedIds={savedIds}
                    onToggleLike={toggleLike}
                    onToggleSave={toggleFavorite}
                  />
                ) : (
                  <SettingsSection
                    profileContent={profileContent}
                    profileFocusToken={settingsProfileToken}
                    videos={videos}
                    articles={articles}
                    photos={photos}
                    likedIds={likedIds}
                    savedIds={savedIds}
                    onToggleLike={toggleLike}
                    onToggleSave={toggleFavorite}
                  />
                ))}

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
