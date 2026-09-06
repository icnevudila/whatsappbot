import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Live panel in WebView = same CSS/JS as mobile Chrome.
 * Do not ship a separate offline UI — that would diverge and feel “abuk”.
 */
const PANEL_URL =
  process.env.FILO_PANEL_URL?.trim() ||
  'https://whatsappbot-ten-omega.vercel.app/giris'

const config: CapacitorConfig = {
  appId: 'app.filo.android',
  appName: 'Filo',
  webDir: 'www',
  // Doğrudan giriş — landing değil.
  server: {
    url: PANEL_URL,
    cleartext: false,
    allowNavigation: [
      'whatsappbot-ten-omega.vercel.app',
      '*.supabase.co',
      '*.vercel.app',
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f3f5f9',
    // Release’de false yap; debug için açık
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 400,
      backgroundColor: '#f3f5f9',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER',
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f3f5f9',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
