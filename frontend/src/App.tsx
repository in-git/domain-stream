import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  INITIAL_PROFILE,
  type ArticleItem,
  type MessageItem,
  type MessageReply,
  type PhotoItem,
  type SectionId,
  type UserProfile,
  type VideoItem,
} from './data/content';
import {
  articleFromPortal,
  categoriesForModule,
  categoryNameMap,
  graphicsToPhotos,
  messageFromPortal,
  portalApi,
  replyFromPortal,
  videoFromPortal,
  type PortalMessage,
  type ReplyDraft,
} from './lib/api';
import { SWIFTUI_SMOOTH } from './lib/motion';
import { SplashScreen } from './components/SplashScreen';
import { LeftSidebar } from './components/LeftSidebar';
import { MainHeader } from './components/MainHeader';
import { MobileTabBar } from './components/MobileTabBar';
import { VideosView } from './components/VideosView';
import { ArticlesView } from './components/ArticlesView';
import { GalleryView } from './components/GalleryView';
import MessagesView from './components/MessagesView';
import { ProfileView, type UserBasicInfo } from './components/ProfileView';
import { ProfilePage } from './components/ProfilePage';
import { SearchOverlay } from './components/SearchOverlay';
import { PortalEmpty, PortalError, SectionSkeleton } from './components/PortalStates';
import {
  authApi,
  cacheClientUser,
  getCachedClientUser,
  getSnowyToken,
  setSnowyToken,
  type SnowyClientUser,
} from './lib/snowyAuth';
import { currentRoute, navigate, subscribeRoute, type RouteInfo } from './lib/router';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { CallbackView } from './components/CallbackView';

type ContentSection = 'videos' | 'articles' | 'gallery' | 'messages';

function usePersistentState<T>(
  key: string,
  defaultValue: T,
  isValid?: (value: unknown) => value is T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaultValue;
      const parsed: unknown = JSON.parse(raw);
      // 本地缓存可能来自旧版本或被手动改坏，校验不通过时回落到默认值
      if (isValid && !isValid(parsed)) return defaultValue;
      return parsed as T;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage quota errors
    }
  }, [key, value]);

  return [value, setValue];
}

const SECTION_IDS: SectionId[] = ['videos', 'articles', 'gallery', 'messages', 'profile'];
/** 记住用户上次停留的板块，下次进入站点直接回到该路由 */
const LAST_SECTION_KEY = 'lumina:last-section';

function isSectionId(value: unknown): value is SectionId {
  return typeof value === 'string' && (SECTION_IDS as string[]).includes(value);
}

/** 收藏存储结构：用户ID -> 收藏的内容ID列表（未登录用 guest 作为键） */
type FavoriteBuckets = Record<string, string[]>;
const FAVORITES_KEY = 'lumina:favorites';
/** 旧版本用过的全站共享收藏键，首次加载时迁移到 guest 桶 */
const LEGACY_FAVORITES_KEY = 'lumina:saved';

function isFavoriteBuckets(value: unknown): value is FavoriteBuckets {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (list) => Array.isArray(list) && list.every((item) => typeof item === 'string')
  );
}

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

  const [route, setRoute] = useState<RouteInfo>(() => currentRoute());
  const [isDark, setIsDark] = usePersistentState<boolean>('lumina:dark', false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getSnowyToken());
  const [currentUserId, setCurrentUserId] = useState(() => getCachedClientUser()?.id || '');
  const [accountEmail, setAccountEmail] = useState(() => {
    const cached = getCachedClientUser();
    return cached?.account || cached?.email || '';
  });
  const [userInfo, setUserInfo] = useState<UserBasicInfo>(() => {
    const cached = getCachedClientUser();
    return {
      email: cached?.email || '',
      phone: cached?.phone || '',
      gender: cached?.gender || '',
      birthday: cached?.birthday || '',
      latestLoginTime: cached?.latestLoginTime || '',
      latestLoginAddress: cached?.latestLoginAddress || '',
    };
  });
  // 换 key 以丢弃旧版本缓存里的示例资料（昵称、简介、常驻地区等静态描述）
  const [profile, setProfile] = usePersistentState<UserProfile>('lumina:profile:v2', INITIAL_PROFILE);

  /* 收藏按用户隔离存储：{ [userId]: 内容ID[] }，未登录时写入 guest 桶 */
  const [favoriteBuckets, setFavoriteBuckets] = usePersistentState<FavoriteBuckets>(
    FAVORITES_KEY,
    {},
    isFavoriteBuckets
  );
  const favoriteOwner = currentUserId || 'guest';
  const savedIds = useMemo(
    () => favoriteBuckets[favoriteOwner] ?? [],
    [favoriteBuckets, favoriteOwner]
  );
  const [likedIds, setLikedIds] = usePersistentState<string[]>('lumina:liked', []);

  /** 切换收藏：写入当前用户（未登录为 guest）对应的收藏桶 */
  const toggleFavorite = useCallback(
    (id: string) => {
      setFavoriteBuckets((prev) => {
        const owner = currentUserId || 'guest';
        const list = prev[owner] ?? [];
        const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
        return { ...prev, [owner]: next };
      });
    },
    [currentUserId, setFavoriteBuckets]
  );

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [videoCategories, setVideoCategories] = useState<string[]>([]);
  const [articleCategories, setArticleCategories] = useState<string[]>([]);
  const [graphicCategories, setGraphicCategories] = useState<string[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<ContentSection, string>>>({});

  /* 悬浮迷你播放器：离开视频板块时继续播放（移动端不展示） */
  const [persistentVideo, setPersistentVideo] = useState<VideoItem | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobileViewport(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);
  const [persistentMuted, setPersistentMuted] = useState(true);
  const [persistentRate, setPersistentRate] = useState(1);
  /* 按 videoId 记录播放进度，回到视频板块或迷你播放器续播 */
  const [videoProgress, setVideoProgress] = usePersistentState<Record<string, number>>(
    'lumina:video-progress',
    {}
  );

  const saveVideoProgress = (id: string, time: number) => {
    if (!id || !Number.isFinite(time) || time <= 0) return;
    setVideoProgress((prev) => ({ ...prev, [id]: time }));
  };

  const handlePlayVideo = (
    video: VideoItem,
    opts?: { muted?: boolean; playbackRate?: number }
  ) => {
    setPersistentVideo(video);
    if (typeof opts?.muted === 'boolean') setPersistentMuted(opts.muted);
    if (typeof opts?.playbackRate === 'number') setPersistentRate(opts.playbackRate);
  };

  const loadFromBackend = useCallback(async () => {
    setLoading(true);
    setErrors({});
    const results = await Promise.allSettled([
      portalApi.categories(),
      portalApi.videos(),
      portalApi.articles(),
      portalApi.graphics(),
      portalApi.messages(),
    ]);
    const [categoryResult, videoResult, articleResult, graphicResult, messageResult] = results;
    const nextErrors: Partial<Record<ContentSection, string>> = {};
    const categories = categoryResult.status === 'fulfilled' ? categoryResult.value : [];
    const names = categoryNameMap(categories);

    const videoItems =
      videoResult.status === 'fulfilled'
        ? videoResult.value.map((row, i) => videoFromPortal(row, i, names))
        : [];
    const articleItems =
      articleResult.status === 'fulfilled'
        ? articleResult.value.map((row, i) => articleFromPortal(row, i, names))
        : [];
    const photoItems =
      graphicResult.status === 'fulfilled'
        ? graphicsToPhotos(graphicResult.value, names)
        : [];

    /* 分类接口不可用时，退回到内容自身携带的分类，保证筛选标签与内容一致 */
    const pickCategories = (fromApi: string[], fromContent: (string | undefined)[]) => {
      if (fromApi.length) return fromApi;
      return Array.from(
        new Set(fromContent.map((item) => (item || '').trim()).filter(Boolean))
      );
    };

    setVideoCategories(
      pickCategories(categoriesForModule(categories, 'VIDEO'), videoItems.map((item) => item.category))
    );
    setArticleCategories(
      pickCategories(categoriesForModule(categories, 'ARTICLE'), articleItems.map((item) => item.category))
    );
    setGraphicCategories(
      pickCategories(categoriesForModule(categories, 'GRAPHIC'), photoItems.map((item) => item.album))
    );

    if (videoResult.status === 'fulfilled') {
      setVideos(videoItems);
    } else {
      nextErrors.videos = videoResult.reason?.message || '视频服务暂不可用';
    }
    if (articleResult.status === 'fulfilled') {
      setArticles(articleItems);
    } else {
      nextErrors.articles = articleResult.reason?.message || '文章服务暂不可用';
    }
    if (graphicResult.status === 'fulfilled') {
      setPhotos(photoItems);
    } else {
      nextErrors.gallery = graphicResult.reason?.message || '图文服务暂不可用';
    }
    if (messageResult.status === 'fulfilled') {
      /* 留言与回复同表存储（单表递归）：parentId 为空为顶级留言，否则沿
         parentId 链向上追溯到顶级留言后分组展示；父级缺失的回复直接丢弃 */
      const rows = messageResult.value;
      const byId = new Map(rows.map((row) => [String(row.id), row]));
      const rootIdOf = (row: PortalMessage): string => {
        let current: PortalMessage | undefined = row;
        while (current?.parentId) {
          const parent = byId.get(current.parentId);
          if (!parent) return '';
          current = parent;
        }
        return String(current?.id ?? '');
      };
      setMessages(rows.filter((row) => !row.parentId).map(messageFromPortal));
      setReplies(
        rows
          .filter((row) => !!row.parentId)
          .filter((row) => rootIdOf(row))
          .map((row) => replyFromPortal(row, rootIdOf(row)))
      );
    } else {
      nextErrors.messages = messageResult.reason?.message || '留言服务暂不可用';
      setReplies([]);
    }

    setErrors(nextErrors);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFromBackend();
  }, [loadFromBackend]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  /* 旧版本把收藏存在全站共享的 lumina:saved，首次加载时并入 guest 桶后清理 */
  useEffect(() => {
    try {
      const legacy = window.localStorage.getItem(LEGACY_FAVORITES_KEY);
      if (!legacy) return;
      window.localStorage.removeItem(LEGACY_FAVORITES_KEY);
      const parsed: unknown = JSON.parse(legacy);
      if (!Array.isArray(parsed)) return;
      const ids = parsed.filter((item): item is string => typeof item === 'string');
      if (!ids.length) return;
      setFavoriteBuckets((prev) => ({
        ...prev,
        guest: Array.from(new Set([...(prev.guest ?? []), ...ids])),
      }));
    } catch {
      window.localStorage.removeItem(LEGACY_FAVORITES_KEY);
    }
  }, [setFavoriteBuckets]);

  const toggleIdInList = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    id: string
  ) => {
    setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectSection = (section: SectionId) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyUser = useCallback((user: SnowyClientUser) => {
    setCurrentUserId(user.id || '');
    setAccountEmail(user.account || user.email || '');
    setUserInfo({
      email: user.email || '',
      phone: user.phone || '',
      gender: user.gender || '',
      birthday: user.birthday || '',
      latestLoginTime: user.latestLoginTime || '',
      latestLoginAddress: user.latestLoginAddress || '',
    });
    cacheClientUser(user);
    setProfile((prev) => ({
      ...prev,
      name: user.nickname || user.name || user.account,
      handle: user.account ? `@${user.account}` : '',
      bio: user.signature || '',
      avatar: user.avatar || prev.avatar,
    }));
    setIsLoggedIn(true);
    /* 未登录期间的收藏并入当前账号，避免登录后收藏“消失” */
    setFavoriteBuckets((prev) => {
      const guest = prev.guest ?? [];
      if (!user.id || !guest.length) return prev;
      return {
        ...prev,
        [user.id]: Array.from(new Set([...(prev[user.id] ?? []), ...guest])),
        guest: [],
      };
    });
  }, [setFavoriteBuckets]);

  // 登录 / 三方回调成功后统一落地：保存 token → 拉用户信息 → 进入个人中心
  const handleAuthSuccess = useCallback(
    (token: string) => {
      setSnowyToken(token);
      setIsLoggedIn(true);
      authApi
        .getLoginUser(token)
        .then(applyUser)
        .catch(() => {
          // token 已保存，用户信息暂不可用时仍允许进入个人中心
        })
        .finally(() => navigate('/profile', true));
    },
    [applyUser]
  );

  useEffect(() => subscribeRoute(() => setRoute(currentRoute())), []);

  // 刷新页面时用已有 token 恢复登录态
  useEffect(() => {
    if (!getSnowyToken()) return undefined;
    let cancelled = false;
    authApi
      .getLoginUser()
      .then((user) => {
        if (!cancelled) applyUser(user);
      })
      .catch(() => {
        if (cancelled) return;
        setSnowyToken(null);
        setIsLoggedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  const handleLogout = useCallback(() => {
    void authApi.logout().finally(() => {
      setIsLoggedIn(false);
      setCurrentUserId('');
      setAccountEmail('');
      setUserInfo({});
      setProfile(INITIAL_PROFILE);
      navigate('/', true);
    });
  }, []);

  const goLogin = useCallback(() => navigate('/login'), []);
  const goRegister = useCallback(() => navigate('/register'), []);
  const goProfile = useCallback(() => {
    navigate('/profile');
    window.scrollTo({ top: 0 });
  }, []);

  const handleAddMessage = async (message: MessageItem) => {
    const realId = await portalApi.addMessage({
      userId: message.userId,
      content: message.content,
    });
    setMessages((prev) => [
      { ...message, id: realId, createdAt: new Date().toISOString(), status: 'APPROVED' },
      ...prev,
    ]);
  };

  /** 提交回复：先乐观插到评论区，后端失败则回滚并向上抛错 */
  const handleAddReply = async (draft: ReplyDraft) => {
    const optimistic: MessageReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      messageId: draft.messageId,
      // 回复提交只带用户 ID，乐观列表先用当前登录用户昵称占位
      nickname: profile.name,
      userId: draft.userId,
      content: draft.content,
      createdAt: new Date().toISOString(),
      replyToNickname: draft.replyToNickname,
    };
    setReplies((prev) => [...prev, optimistic]);
    try {
      const realId = await portalApi.addReply(draft);
      setReplies((prev) =>
        prev.map((item) => (item.id === optimistic.id ? { ...item, id: realId } : item))
      );
    } catch (err) {
      setReplies((prev) => prev.filter((item) => item.id !== optimistic.id));
      throw err;
    }
  };

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (route.kind === 'login') {
    return <LoginView onSuccess={handleAuthSuccess} />;
  }
  if (route.kind === 'register') {
    return <RegisterView />;
  }
  if (route.kind === 'callback') {
    return <CallbackView platform={route.platform || ''} onSuccess={handleAuthSuccess} />;
  }
  if (route.kind === 'profile') {
    return (
      <ProfilePage
        isLoggedIn={isLoggedIn}
        accountEmail={accountEmail}
        profile={profile}
        userInfo={userInfo}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
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
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex bg-[#FBFBFD] text-[#1D1D1F] dark:bg-[#000000] dark:text-[#F5F5F7] transition-colors duration-300">
        {/* Apple-style Launch Splash Screen */}
        <AnimatePresence>
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        </AnimatePresence>

        {/* Douyin Web-style Fixed Left Sidebar Navigation (Desktop & Tablet) */}
        <LeftSidebar
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
        />

        {/* Right Main Viewport Column */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[100dvh]">
          <MainHeader
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            onOpenSearch={() => setIsSearchOpen(true)}
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
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
            {/* 视频板块常驻挂载：切换板块时只改变播放器容器形态，
                <video> 元素不会被销毁重建，避免重新加载造成的卡顿 */}
            <div className={activeSection === 'videos' ? 'block' : 'contents'}>
              {activeSection !== 'videos' ? (
                <VideosView
                  videos={videos}
                  categories={videoCategories}
                  savedIds={savedIds}
                  likedIds={likedIds}
                  searchQuery={searchQuery}
                  onToggleSave={toggleFavorite}
                  onToggleLike={(id) => toggleIdInList(setLikedIds, id)}
                  onPlayVideo={handlePlayVideo}
                  progressById={videoProgress}
                  onSaveProgress={saveVideoProgress}
                  resumeVideoId={persistentVideo?.id}
                  resumeMuted={persistentMuted}
                  resumePlaybackRate={persistentRate}
                  mode={persistentVideo && !isMobileViewport ? 'mini' : 'hidden'}
                  onMiniClose={() => setPersistentVideo(null)}
                  onMiniExpand={() => handleSelectSection('videos')}
                />
              ) : loading ? (
                <SectionSkeleton section="videos" />
              ) : errors.videos ? (
                <PortalError
                  section="videos"
                  message={errors.videos}
                  onRetry={() => void loadFromBackend()}
                    />
                  ) : videos.length === 0 ? (
                    <PortalEmpty section="videos" onRetry={() => void loadFromBackend()} />
                  ) : (
                    <VideosView
                      videos={videos}
                      categories={videoCategories}
                      savedIds={savedIds}
                      likedIds={likedIds}
                      searchQuery={searchQuery}
                      onToggleSave={toggleFavorite}
                      onToggleLike={(id) => toggleIdInList(setLikedIds, id)}
                      onPlayVideo={handlePlayVideo}
                      progressById={videoProgress}
                      onSaveProgress={saveVideoProgress}
                      resumeVideoId={persistentVideo?.id}
                      resumeMuted={persistentMuted}
                      resumePlaybackRate={persistentRate}
                      mode="immersive"
                    />
                  )}
            </div>

            <AnimatePresence mode="wait">
              {activeSection === 'articles' && (
                <motion.div
                  key="section-articles"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={SWIFTUI_SMOOTH}
                >
                  {loading ? (
                    <SectionSkeleton section="articles" />
                  ) : errors.articles ? (
                    <PortalError
                      section="articles"
                      message={errors.articles}
                      onRetry={() => void loadFromBackend()}
                    />
                  ) : articles.length === 0 ? (
                    <PortalEmpty section="articles" onRetry={() => void loadFromBackend()} />
                  ) : (
                    <ArticlesView
                      articles={articles}
                      categories={articleCategories}
                      savedIds={savedIds}
                      likedIds={likedIds}
                      searchQuery={searchQuery}
                      onToggleSave={toggleFavorite}
                      onToggleLike={(id) => toggleIdInList(setLikedIds, id)}
                      onReadArticle={() => {}}
                    />
                  )}
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
                  {loading ? (
                    <SectionSkeleton section="gallery" />
                  ) : errors.gallery ? (
                    <PortalError
                      section="gallery"
                      message={errors.gallery}
                      onRetry={() => void loadFromBackend()}
                    />
                  ) : photos.length === 0 ? (
                    <PortalEmpty section="gallery" onRetry={() => void loadFromBackend()} />
                  ) : (
                    <GalleryView
                      photos={photos}
                      categories={graphicCategories}
                      savedIds={savedIds}
                      likedIds={likedIds}
                      searchQuery={searchQuery}
                      onToggleSave={toggleFavorite}
                      onToggleLike={(id) => toggleIdInList(setLikedIds, id)}
                    />
                  )}
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
                  {loading ? (
                    <SectionSkeleton section="messages" />
                  ) : errors.messages ? (
                    <PortalError
                      section="messages"
                      message={errors.messages}
                      onRetry={() => void loadFromBackend()}
                    />
                  ) : (
                    <MessagesView
                      messages={messages}
                      likedIds={new Set(likedIds)}
                      searchQuery={searchQuery}
                      isLoggedIn={isLoggedIn}
                      currentUser={{
                        name: isLoggedIn ? profile.name : '',
                        userId: isLoggedIn ? currentUserId : undefined,
                        email: isLoggedIn ? accountEmail : undefined,
                        avatar: isLoggedIn ? profile.avatar : undefined,
                      }}
                      onRequireLogin={goLogin}
                      onToggleLike={(id) => toggleIdInList(setLikedIds, id)}
                      onAddMessage={(message) => handleAddMessage(message)}
                      replies={replies}
                      onAddReply={handleAddReply}
                    />
                  )}
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
                  <ProfileView
                    isLoggedIn={isLoggedIn}
                    accountEmail={accountEmail}
                    profile={profile}
                    userInfo={userInfo}
                    onGoLogin={goLogin}
                    onGoRegister={goRegister}
                    onLogout={handleLogout}
                    onUpdateProfile={setProfile}
                    isDark={isDark}
                    onToggleTheme={() => setIsDark((d) => !d)}
                    videos={videos}
                    articles={articles}
                    photos={photos}
                    savedIds={savedIds}
                    onToggleSave={toggleFavorite}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Mobile Bottom Tab Bar */}
        <MobileTabBar
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          transparent={activeSection === 'videos'}
        />

        {/* 移动端独立搜索模块：按当前底部导航模块检索 */}
        <AnimatePresence>
          {isSearchOpen && (
            <SearchOverlay
              section={activeSection}
              videos={videos}
              articles={articles}
              photos={photos}
              messages={messages}
              onClose={() => setIsSearchOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
