import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.Mnetto.app',
  appName: ' Mnetto',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Routes fetch()/XHR through Android's native HTTP client instead of
    // the WebView's own networking stack. Fixes CORS-adjacent failures
    // (like the blank/empty error we're seeing) when calling external APIs
    // such as Supabase from inside the Capacitor WebView.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
