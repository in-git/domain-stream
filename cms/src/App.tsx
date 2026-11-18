import { useCallback, useEffect, useState } from 'react';
import { FileText, Film, Images, Menu, Plus, X } from 'lucide-react';
import { api, getStoredToken, setStoredToken } from './lib/api.ts';
import type {
  ArticleItem,
  ImageTextItem,
  LoginActivity,
  ModuleKey,
  UserProfile,
  VideoItem,
} from './types/cms.ts';
import { LoginView } from './components/LoginView.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { VideoManagerView } from './components/VideoManagerView.tsx';
import { ImageTextManagerView } from './components/ImageTextManagerView.tsx';
import { ArticleManagerView } from './components/ArticleManagerView.tsx';
import { PersonalCenterView } from './components/PersonalCenterView.tsx';

const MODULE_TITLES: Record<ModuleKey, string> = {
  dashboard: '首页看板',
  videos: '视频管理',
  imagetexts: '图文管理',
  articles: '文章管理',
  profile: '个人中心',
};

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loginLogs, setLoginLogs] = useState<LoginActivity[]>([]);
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [imagetexts, setImagetexts] = useState<ImageTextItem[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);

  // Triggers to open creation/upload modals directly from top bar CTA
  const [videoUploadTrigger, setVideoUploadTrigger] = useState(0);
  const [imageTextUploadTrigger, setImageTextUploadTrigger] = useState(0);
  const [articleCreateTrigger, setArticleCreateTrigger] = useState(0);
  const [quickUploadSheetOpen, setQuickUploadSheetOpen] = useState(false);

  const loadAllContent = useCallback(async () => {
    const [vRes, iRes, aRes] = await Promise.all([
      api.getVideos(),
      api.getImageTexts(),
      api.getArticles(),
    ]);
    setVideos(vRes.items);
    setImagetexts(iRes.items);
    setArticles(aRes.items);
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setBooting(false);
      return;
    }
    api
      .me()
      .then(async (res) => {
        setUser(res.user);
        setLoginLogs(res.logs);
        setActiveModule(res.user.defaultModule || 'dashboard');
        await loadAllContent();
      })
      .catch(() => {
        setStoredToken(null);
      })
      .finally(() => {
        setBooting(false);
      });
  }, [loadAllContent]);

  async function handleLoginSuccess(loggedInUser: UserProfile) {
    setUser(loggedInUser);
    setActiveModule(loggedInUser.defaultModule || 'dashboard');
    try {
      const [meRes] = await Promise.all([api.me(), loadAllContent()]);
      setLoginLogs(meRes.logs);
    } catch {
      // already logged in
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore logout error
    }
    setStoredToken(null);
    setUser(null);
  }

  function handlePrimaryTopAction() {
    if (activeModule === 'videos') {
      setVideoUploadTrigger((n) => n + 1);
    } else if (activeModule === 'imagetexts') {
      setImageTextUploadTrigger((n) => n + 1);
    } else if (activeModule === 'articles') {
      setArticleCreateTrigger((n) => n + 1);
    } else {
      setQuickUploadSheetOpen(true);
    }
  }

  const primaryActionLabel =
    activeModule === 'videos'
      ? '上传视频'
      : activeModule === 'imagetexts'
        ? '发布图文'
        : activeModule === 'articles'
          ? '撰写文章'
          : '快速上传';

  if (booting) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#0071E3] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex text-[#1D1D1F]">
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        user={user}
        counts={{
          videos: videos.length,
          imagetexts: imagetexts.length,
          articles: articles.length,
        }}
        onLogout={handleLogout}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on Left — Clean Quick Nav — 1 Primary Action on Right */}
        <header className="sticky top-0 z-30 h-16 bg-[#F5F5F7]/85 backdrop-blur-xl border-b border-[#E5E5EA] px-4 sm:px-8 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="打开导航菜单"
              className="lg:hidden w-9 h-9 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#1D1D1F] shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-[14px] whitespace-nowrap shrink-0">
              <span className="text-[#86868B] hidden sm:inline">工作台</span>
              <span className="text-[#C7C7CC] hidden sm:inline" aria-hidden="true">/</span>
              <h1 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F]">
                {MODULE_TITLES[activeModule]}
              </h1>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handlePrimaryTopAction}
              className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{primaryActionLabel}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-8 py-6">
          {activeModule === 'dashboard' && (
            <DashboardView
              onNavigate={setActiveModule}
              liveRefreshEnabled={user.liveRefresh}
            />
          )}

          {activeModule === 'videos' && (
            <VideoManagerView
              videos={videos}
              onRefresh={loadAllContent}
              externalUploadTrigger={videoUploadTrigger}
            />
          )}

          {activeModule === 'imagetexts' && (
            <ImageTextManagerView
              items={imagetexts}
              onRefresh={loadAllContent}
              externalUploadTrigger={imageTextUploadTrigger}
            />
          )}

          {activeModule === 'articles' && (
            <ArticleManagerView
              articles={articles}
              onRefresh={loadAllContent}
              externalCreateTrigger={articleCreateTrigger}
            />
          )}

          {activeModule === 'profile' && (
            <PersonalCenterView
              user={user}
              logs={loginLogs}
              myCounts={{
                videos: videos.filter((v) => v.authorId === user.id).length,
                imagetexts: imagetexts.filter((i) => i.authorId === user.id).length,
                articles: articles.filter((a) => a.authorId === user.id).length,
              }}
              onUserUpdated={(updated) => setUser(updated)}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Quick Upload Launcher Modal (from Dashboard or Profile top bar) */}
      {quickUploadSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-[460px] bg-white rounded-[22px] border border-[#E5E5EA] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[18px] font-semibold text-[#1D1D1F]">选择要发布的内容类型</h2>
                <p className="text-[13px] text-[#6E6E73] mt-0.5">
                  直接跳转对应模块并开启上传创作面板
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickUploadSheetOpen(false)}
                aria-label="关闭"
                className="w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#6E6E73]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setQuickUploadSheetOpen(false);
                  setActiveModule('videos');
                  setVideoUploadTrigger((n) => n + 1);
                }}
                className="w-full p-4 rounded-2xl bg-[#F5F5F7] hover:bg-[#ECECF0] flex items-center gap-4 text-left transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-[#0071E3]/12 text-[#0071E3] flex items-center justify-center shrink-0">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#1D1D1F]">上传视频作品</div>
                  <div className="text-[12px] text-[#6E6E73]">
                    支持拖入 MP4/MOV/WebM，自动识别时长与首帧封面
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickUploadSheetOpen(false);
                  setActiveModule('imagetexts');
                  setImageTextUploadTrigger((n) => n + 1);
                }}
                className="w-full p-4 rounded-2xl bg-[#F5F5F7] hover:bg-[#ECECF0] flex items-center gap-4 text-left transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-[#34C759]/12 text-[#16A34A] flex items-center justify-center shrink-0">
                  <Images className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#1D1D1F]">发布多图图文</div>
                  <div className="text-[12px] text-[#6E6E73]">
                    批量拖入多张图片，自由排序与指定首页封面
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickUploadSheetOpen(false);
                  setActiveModule('articles');
                  setArticleCreateTrigger((n) => n + 1);
                }}
                className="w-full p-4 rounded-2xl bg-[#F5F5F7] hover:bg-[#ECECF0] flex items-center gap-4 text-left transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-[#5856D6]/12 text-[#5856D6] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#1D1D1F]">撰写专栏文章</div>
                  <div className="text-[12px] text-[#6E6E73]">
                    沉浸式排版编辑器，支持实时预览与头图上传
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
