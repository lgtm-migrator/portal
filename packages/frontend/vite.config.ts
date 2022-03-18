import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import react from '@vitejs/plugin-react'
import babelMacros from 'vite-plugin-babel-macros'

export default defineConfig({
  build: {
    outDir: 'dist',
    target: ['es2020'],
  },
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-styled-components'],
      },
    }),
    svgr(),
    babelMacros(),
  ],
  server: {
    port: 3001,
    watch: {
      usePolling: true
    }
  }
})
