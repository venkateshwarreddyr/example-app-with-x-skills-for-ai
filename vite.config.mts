import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/example-app-with-x-skills-for-ai/',
  plugins: [react()],
})
