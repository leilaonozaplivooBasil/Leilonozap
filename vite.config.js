import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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
