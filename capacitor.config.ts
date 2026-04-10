import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sweetcrunch.puzzle',
  appName: 'Sweet Crunch',
  webDir: 'dist',
  server: {
    // 프로덕션에서는 로컬 파일 서빙
    androidScheme: 'https',
  },
  android: {
    // 풀스크린 + 세로 고정
    backgroundColor: '#FFF8F3',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#FFF8F3',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFF8F3',
    },
    AdMob: {
      // TODO: Google AdMob 콘솔에서 발급받은 앱 ID로 교체하세요.
      // 현재는 Google 공식 테스트 앱 ID가 설정되어 있습니다.
      appId: {
        android: 'ca-app-pub-3940256099942544~3347511713',
      },
    },
  },
};

export default config;
