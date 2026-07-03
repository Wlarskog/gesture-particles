import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'embed' ? '/games/gesture-particles/' : './',
}));
