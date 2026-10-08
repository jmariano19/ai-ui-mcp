import { defineConfig } from 'vite';
export default defineConfig({ build: { outDir: 'dist/ui', assetsInlineLimit: 1000000, cssCodeSplit: false, modulePreload: false }, base: './' });
