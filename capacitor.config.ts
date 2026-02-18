import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leilaonozap.app',
  appName: 'Leilão NoZap',
  webDir: 'dist',
  // Usa build local para suporte offline
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
