import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.a6hub.app',
  appName: 'A6Hub',
  webDir: 'public',
  bundledWebRuntime: false,
  server: {
    // TODO: THAY BẰNG LINK VERCEL THẬT CỦA BẠN TRƯỚC KHI BUILD
    url: 'https://a6hub.vercel.app', 
    cleartext: true
  }
};

export default config;
