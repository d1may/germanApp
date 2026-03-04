import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/vocabulary': 'http://localhost:8000',
      '/grammar': 'http://localhost:8000',
      '/flashcards': 'http://localhost:8000',
      '/chat': 'http://localhost:8000',
    },
  },
})
