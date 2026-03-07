import { defineConfig } from 'vite';

export default defineConfig({
    // Use relative base path so it works on any subdirectory (like github.io/repo-name/)
    base: './',
    build: {
        outDir: 'dist',
    },
});
