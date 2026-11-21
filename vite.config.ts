import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the build works from any web host or subfolder.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
});
