import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  ARTICLES,
  INITIAL_PROFILE,
  PHOTOS,
  VIDEOS,
  type SectionId,
  type UserProfile,
} from './data/content';
import { SWIFTUI_SMOOTH } from './lib/motion';
import { SplashScreen } from './components/SplashScreen';
import { LeftSidebar } from './components/LeftSidebar';
import { MainHeader } from './components/MainHeader';
import { MobileTabBar } from './components/MobileTabBar';
import { VideosView } from './components/VideosView';
import { ArticlesView } from './components/ArticlesView';
import { GalleryView } from './components/GalleryView';
import { ProfileView } from './components/ProfileView';

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

  const [savedIds, setSavedIds] = usePersistentState<string[]>('lumina:saved', [
    'vid-coast-horizon',
    'art-swiftui-physics',
    'pho-staircase',
  ]);
  const [likedIds, setLikedIds] = usePersistentState<string[]>('lumina:liked', [
    'vid-tokyo-rain',
    'pho-alpine-mist',
    'pho-travertine',
  ]);

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
          onReplaySplash={() => setShowSplash(true)}
          isLoggedIn={isLoggedIn}
          profile={profile}
        />

        {/* Right Main Viewport Column */}
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <MainHeader
            activeSection={activeSection}
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
            isLoggedIn={isLoggedIn}
            profile={profile}
            onOpenProfile={() => handleSelectSection('profile')}
          />

          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              {activeSection === 'videos' && (
                <motion.div
                  key="section-videos"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={SWIFTUI_SMOOTH}
                >
                  <VideosView
                    videos={VIDEOS}
                    savedIds={savedIds}
                    likedIds={likedIds}
                    searchQuery={searchQuery}
                    onToggleSave={(id) => toggleIdInList(setSavedIds, id)}
                    onToggleLike={(id) => toggleIdInList(setLikedIds, id)}
                  />
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
                  <ArticlesView
                    articles={ARTICLES}
                    savedIds={savedIds}
                    likedIds={likedIds}
                    searchQuery={searchQuery}
                    onToggleSave={(id) => toggleIdInList(setSavedIds, id)}
                    onToggleLike={(id) => toggleIdInList(setLikedIds, id)}
                    onReadArticle={() => {}}
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
                  <GalleryView
                    photos={PHOTOS}
                    savedIds={savedIds}
                    likedIds={likedIds}
                    searchQuery={searchQuery}
                    onToggleSave={(id) => toggleIdInList(setSavedIds, id)}
                    onToggleLike={(id) => toggleIdInList(setLikedIds, id)}
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
                  <ProfileView
                    isLoggedIn={isLoggedIn}
                    accountEmail={accountEmail}
                    profile={profile}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                    onUpdateProfile={setProfile}
                    isDark={isDark}
                    onToggleTheme={() => setIsDark((d) => !d)}
                    onReplaySplash={() => setShowSplash(true)}
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
