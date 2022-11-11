import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react],
  esbuild: {
    jsxFactory: '_jsx',
    jsxFragment: '_jsxFragment',
    jsxInject: 'import { createElement as _jsx, Fragment as _jsxFragment } from "react"',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
