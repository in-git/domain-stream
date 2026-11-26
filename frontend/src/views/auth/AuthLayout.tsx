import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import heroImage from '../../assets/images/video_hero_coast_1795019172940.jpg';
import { navigate } from '../../lib/router';
import { publicFileUrl, useSystemInfo } from '../../lib/systemInfo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** 登录 / 注册 / 回调页共用的全屏沉浸式认证布局 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { title: siteTitle, config } = useSystemInfo();
  const logoUrl = publicFileUrl(config.logoUrl);
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0B1220]">
      {/* 背景图层：固定铺满，两张渐变保证任意图片上文字都清晰 */}
      <div className="fixed inset-0" aria-hidden="true">
        <img src={heroImage} alt="" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08101E]/95 via-[#0A1424]/70 to-[#0A1424]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050A12]/80 via-transparent to-[#050A12]/30" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col sm:px-8 sm:py-6 lg:px-16 lg:py-10">
        {/* 顶部：返回入口 + 品牌标识（绝对定位浮在内容之上，不占布局空间） */}
        <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-5 pt-5 sm:px-8 md:static md:inset-auto md:px-0 md:pt-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-full bg-black/25 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-black/40"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </button>
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-app border border-white/25 bg-black/25 text-[17px] font-semibold">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                'W'
              )}
            </div>
            <div className="hidden sm:block">
              <p className="text-[14px] font-semibold tracking-wide">{siteTitle}</p>
              <p className="text-[10px] tracking-[0.18em] text-white/50">CONTENT · VISION · DESIGN</p>
            </div>
          </div>
        </header>

        {/* 主体：左侧主视觉 + 右侧表单 */}
        <main className="flex flex-1 items-center py-0 sm:py-12 lg:py-8">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(460px,540px)] lg:gap-16 xl:gap-24">
            <motion.section
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="hidden max-w-2xl text-white lg:block"
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.32em] text-white/55">
                Member Access
              </p>
              <h2 className="mt-7 text-[52px] font-semibold leading-[1.12] tracking-tight xl:text-[64px]">
                让好内容，
                <br />
                被对的人看见。
              </h2>
              <p className="mt-7 max-w-xl text-[16px] leading-[1.9] text-white/70">
                登录后即可收藏喜欢的视频与文章，参与留言互动，并管理你的个人资料。
              </p>
              <ul className="mt-10 space-y-4">
                {['微信扫码一键登录注册', '收藏与点赞同步到账号', '留言互动与回复提醒'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[14px] text-white/75">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6CB6FF]" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <div className="min-h-dvh rounded-none border-0 bg-white/95 px-6 pb-6 pt-24 shadow-none sm:min-h-0 sm:rounded-app sm:border sm:border-white/70 sm:px-10 sm:pb-10 sm:pt-24 sm:shadow-[0_32px_100px_rgba(2,8,20,0.35)] sm:backdrop-blur-2xl lg:px-11 lg:pb-11 lg:pt-10 dark:bg-[#111318]/95 sm:dark:border-app-border">
                <div className="mb-8">
                  <h1 className="text-[30px] font-semibold tracking-tight text-app-text">
                    {title}
                  </h1>
                  <p className="mt-2 text-[14px] text-app-muted">{subtitle}</p>
                </div>
                {children}
              </div>
            </motion.section>
          </div>
        </main>

        {/* 注册/返回等引导提示改为底部 toast，不占卡片布局 */}
        <AnimatePresence>
          {footer && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed bottom-6 left-0 right-0 z-40 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full bg-black/60 px-6 py-3 text-center text-[14px] text-white shadow-lg backdrop-blur-md"
            >
              {footer}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
