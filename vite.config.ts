import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 使用相对资源路径，兼容 GitHub Pages 的仓库子路径部署。
  base: './',
  plugins: [vue()],
})
