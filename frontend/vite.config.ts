import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': '/src/app',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@services': '/src/services',
      '@state': '/src/state',
      '@styles': '/src/styles'
    }
  },
  server: {
    port: 5173,
  }
});
