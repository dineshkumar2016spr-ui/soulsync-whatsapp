// Runtime config for Soul Sync. Edit the placeholders below (or wire your bundler to inject them).
window.SOULSYNC_CONFIG = {
  // Backend origin for fetch + SSE. '' means same origin (local dev server / Capacitor).
  // Production: baked in from VITE_API_BASE_URL at build time, e.g. https://soulsync.up.railway.app
  apiBaseUrl: "https://soulsync-whatsapp.onrender.com",
  revenueCat: {
    // Paste your RevenueCat public SDK keys here (safe to ship in client code).
    androidKey: 'YOUR_REVENUECAT_ANDROID_KEY',
    iosKey: 'YOUR_REVENUECAT_IOS_KEY',
    // Offering / package identifiers configured in the RevenueCat dashboard.
    offerings: {
      starter: 'starter_60_credits',   // 60 credits / 7 days
      pro: 'pro_monthly_500',          // 500 credits / month
    },
  },
  // URL scheme registered in Xcode/AndroidManifest for the Share Extension handoff.
  appUrlScheme: 'soulsync',
};
