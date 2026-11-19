import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const main = fileURLToPath(new URL('./index.html', import.meta.url));
const admin = fileURLToPath(new URL('./admin.html', import.meta.url));
export default defineConfig({ base: './', server: { host: '0.0.0.0' }, build: { rollupOptions: { input: { main, admin } } } });
