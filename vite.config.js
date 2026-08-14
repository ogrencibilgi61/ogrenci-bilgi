import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

function getBasePath() {
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH
  }

  if (process.env.VERCEL) {
    return '/'
  }

  if (process.env.GITHUB_REPOSITORY) {
    return `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  }

  return '/ogrenci-bilgi/'
}

export default defineConfig({
  base: getBasePath(),
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
