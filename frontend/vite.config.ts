import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

// 迁移到新后端时只需设置 VITE_API_TARGET / VITE_WS_TARGET
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:82';
const wsTarget = process.env.VITE_WS_TARGET || apiTarget.replace(/^http/, 'ws');

// Snowy 认证后端代理：/snowy/* -> http://<SNOWY_HOST>:<SNOWY_PORT>/api/*
// 与 cms 项目保持一致，dev 与 preview 共用。
const snowyProxy = {
  '/snowy': {
    target: `http://${process.env.SNOWY_HOST || 'localhost'}:${Number(process.env.SNOWY_PORT) || 91}`,
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/snowy/, '/api'),
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
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api/, ''),
        },
        // 访客 WebSocket：/ws/* -> ws://localhost:82/*
        '/ws': {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/ws/, ''),
        },
        ...snowyProxy,
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api/, ''),
        },
        '/ws': {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/ws/, ''),
        },
        ...snowyProxy,
      },
    },
  };
});
