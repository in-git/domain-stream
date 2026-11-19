import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  INITIAL_PROFILE,
  type ArticleItem,
  type MessageItem,
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
  videoFromPortal,
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
import { ProfileView } from './components/ProfileView';
import { PortalEmpty, PortalError, SectionSkeleton } from './components/PortalStates';

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

  const [isDark, setIsDark] = usePersistentState<boolean>('lumina:dark', false);
  const [isLoggedIn, setIsLoggedIn] = usePersistentState<boolean>('lumina:logged-in', true);
  const [accountEmail, setAccountEmail] = usePersistentState<string>(
    'lumina:account-email',
    'linyu@lumina.studio'
  );
  const [profile, setProfile] = usePersistentState<UserProfile>('lumina:profile', INITIAL_PROFILE);

  const [savedIds, setSavedIds] = usePersistentState<string[]>('lumina:saved', []);
  const [likedIds, setLikedIds] = usePersistentState<string[]>('lumina:liked', []);

  const [messages, setMessages] = useState<MessageItem[]>([]);
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
    ]);
    const [categoryResult, videoResult, articleResult, graphicResult, messageResult] = results;
    const nextErrors: Partial<Record<ContentSection, string>> = {};
    const categories = categoryResult.status === 'fulfilled' ? categoryResult.value : [];
    const names = categoryNameMap(categories);

    setVideoCategories(categoriesForModule(categories, 'VIDEO'));
    setArticleCategories(categoriesForModule(categories, 'ARTICLE'));
    setGraphicCategories(categoriesForModule(categories, 'GRAPHIC'));

    if (videoResult.status === 'fulfilled') {
      setVideos(videoResult.value.map((row, i) => videoFromPortal(row, i, names)));
    } else {
      nextErrors.videos = videoResult.reason?.message || '视频服务暂不可用';
    }
    if (articleResult.status === 'fulfilled') {
      setArticles(articleResult.value.map((row, i) => articleFromPortal(row, i, names)));
    } else {
      nextErrors.articles = articleResult.reason?.message || '文章服务暂不可用';
    }
    if (graphicResult.status === 'fulfilled') {
      setPhotos(graphicsToPhotos(graphicResult.value, names));
    } else {
      nextErrors.gallery = graphicResult.reason?.message || '图文服务暂不可用';
    }
    if (messageResult.status === 'fulfilled') {
      setMessages(messageResult.value.map(messageFromPortal));
    } else {
      nextErrors.messages = messageResult.reason?.message || '留言服务暂不可用';
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

  const handleLogin = (email: string, nickname?: string) => {
    setAccountEmail(email);
    if (nickname) {
      setProfile((prev) => ({
        ...prev,
        name: nickname,
        handle: `@${email.split('@')[0] || 'lumina.user'}`,
      }));
    }
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleAddMessage = async (message: MessageItem) => {
    await portalApi.addMessage({
      nickname: message.nickname,
      email: message.email,
      content: message.content,
    });
    setMessages((prev) => [
      { ...message, createdAt: new Date().toISOString(), status: 'PENDING' },
      ...prev,
    ]);
  };

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

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
          isDark={isDark}
          onToggleTheme={() => setIsDark((d) => !d)}
        />

        {/* Right Main Viewport Column */}
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <MainHeader
            activeSection={activeSection}
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
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
                      onToggleLike={(id) => toggleIdInList(setLikedIds, id)}
                      onAddMessage={(message) => handleAddMessage(message)}
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
                    onLogin={handleLogin}
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
