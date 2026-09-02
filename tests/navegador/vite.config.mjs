// Config só da banca de testes: mesmo atalho `@` do projeto, sem PWA, sem
// carimbo de versão, sem nada do deploy.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: aqui,
  base: './',
  logLevel: 'error',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(aqui, '../../src') } },
  define: { __BUILD_VERSION__: JSON.stringify('banca') },
  build: { outDir: process.env.SAIDA_BANCA || '/tmp/banca-carrossel', emptyOutDir: true },
});
