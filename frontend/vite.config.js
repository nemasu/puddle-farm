import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [svgr()],
  test: {
    globals: true,
    environment: 'node',
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://puddle.farm',
        changeOrigin: true,
      },
    },
  },
})