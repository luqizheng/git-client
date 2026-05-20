import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import path from 'path'

export default defineConfig({
  plugins: [vue(), UnoCSS()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
