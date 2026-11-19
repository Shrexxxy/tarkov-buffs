import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Относительный base: сайт работает и на GitHub Pages в подпапке репозитория, и локально.
export default defineConfig({
  base: './',
  plugins: [react()],
});
