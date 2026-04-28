import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gasUrl = new URL(env.VITE_API_URL || 'https://script.google.com')

  return {
    base: '/financial-dashboard/',
    plugins: [react()],
    server: {
      proxy: {
        '/gas-api': {
          target: gasUrl.origin,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/gas-api/, gasUrl.pathname),
        },
      },
    },
  }
})
