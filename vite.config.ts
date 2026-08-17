import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import obfuscator from 'rollup-plugin-obfuscator';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: '/',
  server: {
    port: 8080,
    host: true,
    headers: {
      'Content-Security-Policy': "default-src 'self' 'unsafe-eval' 'unsafe-inline' data: blob: *; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval' data: blob: *; style-src 'self' 'unsafe-inline' *; img-src 'self' data: blob: *; font-src 'self' data: *; connect-src 'self' *; media-src 'self' data: blob: *; worker-src 'self' blob: *;"
    }
  },
  plugins: [
    tailwindcss(),
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      autoCodeSplitting: true,
    }),
    react(),
    // Disable obfuscator in production to prevent runtime errors
    // process.env.NODE_ENV === 'production' ? obfuscator() : null,
  ].filter(Boolean),
  resolve: {
    tsconfigPaths: true,
    dedupe: ['react', 'react-dom'],
    alias: {
      'node:async_hooks': __dirname + '/src/async-local-storage-polyfill.ts',
    },
  },
  optimizeDeps: {
    include: ['@tanstack/react-start'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        chunkFileNames: 'assets/[name].js',
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    global: 'globalThis',
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __PRODUCTION__: JSON.stringify(process.env.NODE_ENV === 'production'),
    __LICENSE_ENABLED__: JSON.stringify(true),
    __HWID_BINDING__: JSON.stringify(true),
    __DOMAIN_RESTRICTION__: JSON.stringify(true),
  }
});