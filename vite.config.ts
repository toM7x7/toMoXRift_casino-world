import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import path from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import federation from '@originjs/vite-plugin-federation'

function copyWorldRuntimeAssets() {
  const assets = [
    ['public/design/animal-emblem-atlas-v31.png', 'dist/animal-emblem-atlas-v31.png'],
    ['public/fonts/MPLUS1p-Regular.ttf', 'dist/MPLUS1p-Regular.ttf'],
  ] as const

  return {
    name: 'copy-world-runtime-assets',
    closeBundle() {
      for (const [source, target] of assets) {
        copyFileSync(path.resolve(__dirname, source), path.resolve(__dirname, target))
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    copyWorldRuntimeAssets(),
    dts({
      insertTypesEntry: true,
    }),
    federation({
      name: 'xrift_neon_casino_club',
      filename: 'remoteEntry.js',
      exposes: {
        './World': './src/index.tsx',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '*',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '*',
        },
        'react/jsx-runtime': {
          singleton: true,
        },
        three: {
          singleton: true,
          requiredVersion: '*',
        },
        'three/addons/loaders/DRACOLoader.js': {
          singleton: true,
        },
        '@react-three/fiber': {
          singleton: true,
          requiredVersion: '*',
        },
        '@react-three/rapier': {
          singleton: true,
          requiredVersion: '*',
        },
        '@react-three/drei': {
          singleton: true,
          requiredVersion: '*',
        },
        '@react-three/uikit': {
          singleton: true,
          requiredVersion: '*',
        },
        '@xrift/world-components': {
          singleton: true,
          requiredVersion: '*',
        },
      },
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    assetsDir: '',
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
})
