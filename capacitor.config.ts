import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.soulsync.app',
  appName: 'Soul Sync',
  webDir: 'web',
  bundledWebRuntime: false,
  server: {
    // Allow the native shell to reach your self-hosted backend and the WhatsApp WebSocket.
    // In production this should be your deployed HTTPS origin.
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: ['*'],
  },
  plugins: {
    // iOS App Group used by the Share Extension to hand shared files to the main app.
    // Must match the App Group configured in Xcode for both targets.
    CapacitorShareTarget: {
      appGroupId: 'group.com.soulsync.app',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#fffafc',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#fffafc',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'LIGHT',
      resizeOnFullScreen: true,
    },
    Share: {
      // Receiving shared WhatsApp exports is handled by the native intent filters below
      // plus the listener in src/shareTarget.ts.
    },
  },
};

export default config;
