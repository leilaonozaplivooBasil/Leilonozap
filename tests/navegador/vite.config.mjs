// Config só da banca de testes: mesmo atalho `@` do projeto, sem PWA, sem
// carimbo de versão, sem nada do deploy.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const aqui = path.dirname(fileURLToPath(import.meta.url));

// 🔴 03/09/2026 — as páginas são DESCOBERTAS, não listadas.
// Duas PRs abertas no mesmo dia (a data de término e o lance de 1970) criaram
// cada uma a sua banca e cada uma acrescentou uma linha nesta lista à mão:
// conflito de merge garantido, no arquivo de teste, sem nenhum motivo real.
// Agora basta largar um `*.html` nesta pasta.
const paginas = Object.fromEntries(
  readdirSync(aqui)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [path.basename(f, '.html'), path.resolve(aqui, f)]),
);

export default defineConfig({
  root: aqui,
  base: './',
  logLevel: 'error',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(aqui, '../../src') } },
  define: { __BUILD_VERSION__: JSON.stringify('banca') },
  build: {
    outDir: process.env.SAIDA_BANCA || '/tmp/banca-carrossel',
    emptyOutDir: true,
    rollupOptions: { input: paginas },
  },
});
