import { useCallback, useEffect, useState } from 'react';
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
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
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

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>('videos');
  const [searchQuery, setSearchQuery] = useState('');

  const [route, setRoute] = useState<RouteInfo>(() => currentRoute());
  const [isDark, setIsDark] = usePersistentState<boolean>('lumina:dark', false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getSnowyToken());
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
  const [profile, setProfile] = usePersistentState<UserProfile>('lumina:profile', INITIAL_PROFILE);

  const [savedIds, setSavedIds] = usePersistentState<string[]>('lumina:saved', []);
  const [likedIds, setLikedIds] = usePersistentState<string[]>('lumina:liked', []);

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

  const loadFromBackend = useCallback(async () => {
    setLoading(true);
    setErrors({});
    const results = await Promise.allSettled([
      portalApi.categories(),
      portalApi.videos(),
      portalApi.articles(),
      portalApi.graphics(),
      portalApi.messages(),
      portalApi.messageReplies(),
    ]);
    const [categoryResult, videoResult, articleResult, graphicResult, messageResult, replyResult] =
      results;
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
      setMessages(messageResult.value.map(messageFromPortal));
    } else {
      nextErrors.messages = messageResult.reason?.message || '留言服务暂不可用';
    }
    /* 回复是增量能力：后端尚未部署 / 接口报错时静默降级，
       留言与站长回复仍可正常使用，只是暂时没有用户评论区 */
    if (replyResult.status === 'fulfilled') {
      setReplies(replyResult.value.map(replyFromPortal));
    } else {
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
      handle: `@${user.account}`,
      bio: user.signature || prev.bio,
      avatar: user.avatar || prev.avatar,
    }));
    setIsLoggedIn(true);
  }, []);

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
    await portalApi.addMessage({
      nickname: message.nickname,
      email: message.email,
      content: message.content,
    });
    setMessages((prev) => [
      { ...message, createdAt: new Date().toISOString(), status: 'APPROVED' },
      ...prev,
    ]);
  };

  /** 提交回复：先乐观插到评论区，后端失败则回滚并向上抛错 */
  const handleAddReply = async (draft: ReplyDraft) => {
    const optimistic: MessageReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      messageId: draft.messageId,
      nickname: draft.nickname,
      avatar: draft.avatar,
      email: draft.email,
      content: draft.content,
      createdAt: new Date().toISOString(),
      replyToNickname: draft.replyToNickname,
    };
    setReplies((prev) => [...prev, optimistic]);
    try {
      await portalApi.addReply(draft);
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
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <MainHeader
            activeSection={activeSection}
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
            account={{
              isLoggedIn,
              displayName: profile.name,
              avatarUrl: profile.avatar,
              onGoLogin: goLogin,
              onGoRegister: goRegister,
              onGoProfile: goProfile,
              onLogout: handleLogout,
            }}
          />

          <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-4 sm:pt-6 pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              {activeSection === 'videos' && (
                <motion.div
                  key="section-videos"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={SWIFTUI_SMOOTH}
                >
                  {loading ? (
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
                      onToggleSave={(id) => toggleIdInList(setSavedIds, id)}
                      onToggleLike={(id) => toggleIdInList(setLikedIds, id)}
                    />
                  )}
                </motion.div>
              )}

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
                      onToggleSave={(id) => toggleIdInList(setSavedIds, id)}
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
                      onToggleSave={(id) => toggleIdInList(setSavedIds, id)}
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
        />
      </div>
    </MotionConfig>
  );
}
