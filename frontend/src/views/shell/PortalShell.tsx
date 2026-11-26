import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { registerCommentLogin } from '../../lib/commentLogin.ts';
import { publicFileUrl, useSystemInfo } from '../../lib/systemInfo';
import { SplashScreen } from '../../components/SplashScreen';
import { BUILTIN_SECTIONS } from './LeftSidebar';
import { isSectionId } from '../app';
import { parseNav } from './navConfig';
import { SectionPlaceholder } from './SectionPlaceholder';
import { MainHeader } from './MainHeader';
import { PortalNavProvider } from './PortalNav';
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
  /** 移动端沉浸流清屏：顶部/底部导航默认隐藏，点画面唤出，播放后自动收起 */
  const [videoChromeVisible, setVideoChromeVisible] = useState(false);
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
    videoLoadMoreError,
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

  // 设置页的喜欢/收藏需要三类内容，只在用户打开对应详情时才按需加载
  const loadFavoriteSources = () => {
    (['videos', 'articles', 'gallery'] as const).forEach((section) =>
      void loadSection(section)
    );
  };

  // PC 个人中心独立组件
  const profileContent = (
    <ProfilePCView
      isLoggedIn={isLoggedIn}
      profile={profile}
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

  // 留言墙内容复用：独立板块自己带导航，设置中心内嵌时不带
  const renderMessages = (withNav: boolean) => (
    <MessagesSection
      withNav={withNav}
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
      onRefresh={() => void loadSection('messages', true)}
      onRequireLogin={goLogin}
      onToggleLike={toggleLike}
      onAddMessage={(message) => void addMessage(message)}
      onAddReply={addReply}
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

  // 离开视频沉浸流或切到卡片模式时，清除临时唤出的导航状态
  useEffect(() => {
    if (activeSection !== 'videos' || videoViewMode !== 'feed') setVideoChromeVisible(false);
  }, [activeSection, videoViewMode]);

  // 稳定引用：加载失败触发的重渲染不应让 IntersectionObserver 反复重连
  const handleLoadMoreVideos = useCallback(() => void loadMoreVideos(), [loadMoreVideos]);

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
    <PortalNavProvider
      value={{ activeSection, onSelectSection, transparent: activeSection === 'videos' }}
    >
      <MotionConfig reducedMotion="user">
      <div
        className={`min-h-screen flex md:pl-20 lg:pl-60 text-app-text transition-colors duration-300 ease-out ${
          activeSection === 'videos' && isMobileViewport
            ? 'bg-black'
            : 'bg-app-bg'
        }`}
      >
        <AnimatePresence>
          {showSplash && <SplashScreen onComplete={onSplashComplete} />}
        </AnimatePresence>

        <div className="flex-1 min-w-0 flex flex-col min-h-[100dvh] overflow-hidden">
          <AnimatePresence>
          {!(isMobileViewport &&
              (activeSection === 'settings' ||
                (activeSection === 'videos' &&
                  videoViewMode === 'feed' &&
                  !videoChromeVisible))) && (
            <MainHeader
              key="main-header"
              chromeAnimated={isMobileViewport && activeSection === 'videos' && videoViewMode === 'feed'}
              searchQuery={searchQuery}
              onChangeSearch={onChangeSearch}
              onOpenSearch={onOpenSearch}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              overlay={activeSection === 'videos' && isMobileViewport && videoViewMode === 'feed'}
              solidBlack={activeSection === 'videos' && isMobileViewport && videoViewMode === 'grid'}
              showViewToggle={activeSection === 'videos' && isMobileViewport}
              sectionBackground={activeSection === 'articles' ? 'page' : 'default'}
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
          </AnimatePresence>

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
              loadMoreError={videoLoadMoreError}
              onLoadMoreVideos={handleLoadMoreVideos}
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
              headerFloating={activeSection === 'videos' && videoViewMode === 'feed'}
              playlistOpen={videoPlaylistOpen}
              onClosePlaylist={() => setVideoPlaylistOpen(false)}
              hideMobileTabBar={
                isMobileViewport &&
                activeSection === 'videos' &&
                videoViewMode === 'feed' &&
                !videoChromeVisible
              }
              mobileChromeVisible={videoChromeVisible}
              onChromeVisibilityChange={setVideoChromeVisible}
            />

            <AnimatePresence mode="wait">
              {activeSection === 'articles' && (
                <motion.div
                  key="section-articles"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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
                  className="px-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={SWIFTUI_SMOOTH}
                >
                  {renderMessages(true)}
                </motion.div>
              )}

              {activeSection === 'settings' &&
                (isMobileViewport ? (
                  <SettingsMobileSection
                    profileContent={profileContentMobile}
                    messagesContent={renderMessages(false)}
                    profileFocusToken={settingsProfileToken}
                    profileName={profile.name}
                    profileHandle={profile.handle}
                    profileBio={profile.bio}
                    profileAvatar={profile.avatar}
                    isLoggedIn={isLoggedIn}
                    onOpenEditProfile={profileForm.openEditModal}
                    onOpenFavorites={loadFavoriteSources}
                    onOpenMessages={() => void loadSection('messages', true)}
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
                    messagesContent={renderMessages(false)}
                    onOpenFavorites={loadFavoriteSources}
                    onOpenMessages={() => void loadSection('messages', true)}
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

              {/* 自定义模块 / 个人中心兜底：保证这些导航项也有板块级导航 */}
              {(isCustomSection || activeSection === 'profile') && (
                <SectionPlaceholder
                  key={`section-${activeSection}`}
                  label={activeSection === 'profile' ? '个人中心' : customNavItem?.label || activeSection}
                  sectionId={activeSection}
                  iconUrl={activeSection === 'profile' ? undefined : customNavItem?.iconUrl}
                  onGoHome={() => onSelectSection('videos')}
                />
              )}
            </AnimatePresence>
          </main>
        </div>

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
    </PortalNavProvider>
  );
}
