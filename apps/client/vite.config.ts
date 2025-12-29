import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { getServerPaths } from '@repo/shared/server';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

const { PROJECT_ROOT } = getServerPaths(__dirname);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, PROJECT_ROOT, '');
  const API_PORT = env.PORT || 3000;
  return {
    plugins: [vue(), wasm(), topLevelAwait()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    // 确保 optimizeDeps 不会破坏 wasm 链接
    optimizeDeps: {
      exclude: ['@repo/wasm']
    },
    server: {
      host: '0.0.0.0',
      proxy: {
        // API 接口
        '/api': {
          target: `http://localhost:${ API_PORT }`,
          changeOrigin: true,
        }
      }
    }
  }
})
