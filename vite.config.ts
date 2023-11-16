import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import electron from 'vite-plugin-electron';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

const shouldRunElectron = process.env.VITE_IS_DESKTOP == 'true' || process.env.APP_DEV?.includes('true');

export default defineConfig({
  base: './',
  plugins: [
    react(),
    svgr(),
    nodePolyfills({
      protocolImports: true,
      globals: {
        global: true,
        process: true,
        Buffer: true
      }
    }),
    shouldRunElectron && electron([
      {
        entry: "electron/main.ts",
        vite: {
          build: {
            outDir: 'dist'
          }
        },
      },
      {
        entry: "electron/preload.ts",
        vite: {
          build: {
            outDir: 'dist'
          }
        },
      }
    ])
  ],
  resolve: {
    alias: {
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
      '~fontawesome': path.resolve(__dirname, 'node_modules/@fortawesome/fontawesome-free'),
    }
  },
  server: { // dev server
    port: 3000,
    proxy: {
      "/_public": {
        target: 'https://niftyart.cash',
        changeOrigin: true,
      }
    },
    open: !shouldRunElectron
  }
})