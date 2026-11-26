import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

// 迁移到新后端时设置 VITE_API_TARGET，优先级高于 SNOWY_HOST / SNOWY_PORT
const apiTarget =
  process.env.VITE_API_TARGET ||
  `http://${process.env.SNOWY_HOST || 'localhost'}:${Number(process.env.SNOWY_PORT) || 82}`;

// 小诺 Snowy 后端代理：/snowy/* -> 后端根路径
// 后端服务挂在根路径（无 /api 前缀），这里仅剥掉 /snowy 前缀。
const snowyProxy = {
  '/snowy': {
    target: apiTarget,
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/snowy/, ''),
  },
};

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: snowyProxy,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      proxy: snowyProxy,
    },
  };
});
