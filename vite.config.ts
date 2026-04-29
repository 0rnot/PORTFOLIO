import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages デプロイ用の設定
export default defineConfig({
  plugins: [react()],
  base: '/PORTFOLIO/', // GitHubリポジトリ名に合わせる
})
