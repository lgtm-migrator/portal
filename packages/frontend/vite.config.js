import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import react from '@vitejs/plugin-react'
import babelMacros from 'vite-plugin-babel-macros'

// https://vitejs.dev/config/
export default defineConfig({
  // This changes the out put dir from dist to build
  // comment this out if that isn't relevant for your project
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
})
