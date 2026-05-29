import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
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
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Core framework — sempre carregado
          if (id.match(/[\\/]react([\\/]|$)|[\\/]react-dom[\\/]|[\\/]scheduler[\\/]/)) return 'vendor-react';
          if (id.includes('react-router')) return 'vendor-router';

          // UI primitives (shadcn/Radix)
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('framer-motion')) return 'vendor-motion';

          // Data fetch + state
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('react-hook-form') || id.includes('zod')) return 'vendor-forms';

          // PDFs/charts/heavy libs — lazy
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('xlsx') || id.includes('papaparse')) return 'vendor-spreadsheet';

          // Base44 SDK legacy (caso ainda venha)
          if (id.includes('@base44')) return 'vendor-base44';

          // Resto dos node_modules num chunk genérico
          return 'vendor-misc';
        },
      },
    },
  },
});
