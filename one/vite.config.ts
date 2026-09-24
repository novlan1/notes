import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';

// https://vite.dev/config/
export default defineConfig({
  // 站点挂在 notes 大仓的 Pages 子路径下：https://novlan1.github.io/notes/one/
  // （原独立仓库时为 '/one/'，并入 notes 后前缀多一层）
  base: '/notes/one/',
  plugins: [
    vue(),
    vueJsx(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
