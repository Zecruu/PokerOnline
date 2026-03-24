import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    server: { port: 3001 },
    build: { outDir: 'dist' },
});
