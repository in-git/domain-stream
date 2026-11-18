import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { APPLE_EASE, SWIFTUI_SMOOTH } from '../lib/motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(38), 160);
    const t2 = setTimeout(() => setProgress(78), 620);
    const t3 = setTimeout(() => setProgress(100), 1180);
    const done = setTimeout(() => onComplete(), 1850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(done);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 1.045,
        filter: 'blur(8px)',
        transition: { duration: 0.52, ease: APPLE_EASE },
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000000] text-[#F5F5F7] select-none overflow-hidden"
      aria-label="应用加载中"
    >
      {/* Subtle Apple-grade radial ambient illumination behind emblem */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 0.45, scale: 1.15 }}
        transition={{ duration: 1.4, ease: APPLE_EASE }}
        className="pointer-events-none absolute w-[360px] h-[360px] rounded-full bg-radial from-[#0A84FF]/25 via-[#5E5CE6]/10 to-transparent blur-3xl"
      />

      <div className="relative flex flex-col items-center">
        {/* Vector Prism / Aperture Emblem with SVG stroke reveal */}
        <motion.div
          initial={{ scale: 0.84, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SWIFTUI_SMOOTH}
          className="mb-7 relative flex items-center justify-center w-20 h-20 rounded-[22px] bg-[#161618] border border-white/10 shadow-2xl"
        >
          <svg
            viewBox="0 0 64 64"
            className="w-11 h-11 text-white"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <motion.circle
              cx="32"
              cy="32"
              r="21"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0.3 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: APPLE_EASE }}
            />
            <motion.path
              d="M32 15L46.7 40.5H17.3L32 15Z"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.92 }}
              transition={{ duration: 0.95, delay: 0.18, ease: APPLE_EASE }}
            />
            <motion.circle
              cx="32"
              cy="32"
              r="4"
              fill="#0A84FF"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24, delay: 0.48 }}
            />
          </svg>
        </motion.div>

        {/* Wordmark with crisp Apple reveal */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SWIFTUI_SMOOTH, delay: 0.18 }}
          className="text-3xl font-semibold tracking-tight text-white"
        >
          Lumina
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.68, y: 0 }}
          transition={{ ...SWIFTUI_SMOOTH, delay: 0.3 }}
          className="mt-2 text-xs tracking-[0.18em] text-[#A1A1A6]"
        >
          影像 · 文章 · 视觉志
        </motion.p>

        {/* Apple macOS-inspired ultra-thin boot progress bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0.85 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.25, ease: APPLE_EASE }}
          className="mt-10 w-44 h-[3px] rounded-full bg-white/15 overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-full bg-white"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.55, ease: APPLE_EASE }}
          />
        </motion.div>
      </div>

      {/* Discreet skip control */}
      <motion.button
        type="button"
        onClick={onComplete}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.65 }}
        whileHover={{ opacity: 1 }}
        whileTap={{ scale: 0.96 }}
        transition={{ delay: 0.45 }}
        className="absolute bottom-8 px-4 py-2 min-h-[44px] text-xs font-medium text-[#A1A1A6] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF] rounded-lg"
      >
        跳过开屏
      </motion.button>
    </motion.div>
  );
}
