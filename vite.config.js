import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  logLevel: 'error',
  // produção: remove console.* e debugger do bundle (mantém em dev)
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : {},
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true
    }),
    react(),
    // 📱 PWA: manifest + service worker (o mobile é o espelho instalável do desktop).
    // autoUpdate: nova versão publicada assume sozinha, sem usuário preso em cache velho.
    VitePWA({
      registerType: 'autoUpdate',
      // manifest.webmanifest (padrão): /manifest.json ficou envenenado no cache do
      // CDN da Vercel (servia o fallback HTML antes do arquivo existir)
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Leilão NoZap — Loja Virtual & Leilões',
        short_name: 'Leilão NoZap',
        description: 'Loja virtual e leilões online com até 60% de desconto. Dê seu lance, arremate e receba em casa.',
        lang: 'pt-BR',
        start_url: '/Loja-Virtual',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#111827',
        theme_color: '#111827',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // atalho de app instalado (pressionar o ícone) direto pro Rank Premiado
        shortcuts: [
          {
            name: 'Rank Premiado',
            short_name: 'Rank',
            description: 'Indique amigos e ganhe prêmios todo dia',
            url: '/rankpremiado',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // SPA fallback do SW igual ao vercel.json: tudo que não é /api cai no index
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // dados dinâmicos (Base44/Supabase) NUNCA em cache — sempre rede
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gezvviyegtxytnwjkrjv\.supabase\.co\/storage\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'supabase-imagens', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Estratégia conservadora: só isolar libs PESADAS/RARAMENTE-USADAS pra ficarem
        // lazy. O resto (react + radix + lucide + framer + supabase) fica no bundle
        // padrão pra manter ordem de inicialização correta.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('pdfjs')) return 'vendor-pdf';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('xlsx') || id.includes('papaparse')) return 'vendor-spreadsheet';
          return undefined;
        },
      },
    },
  },
}));
