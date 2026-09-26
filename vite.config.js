import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    setupFiles: ['./src/test/setup.js'],
    // The screen tests type key by key, as a person would, and every test file runs at
    // once: on a busy machine a long form goes past the default 5 s without anything wrong.
    testTimeout: 15_000,
  },
  resolve: {
    // `@/components/ui/button` instead of `../../components/ui/button`, from any depth.
    // Mirrored in jsconfig.json so the editor follows it too.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
