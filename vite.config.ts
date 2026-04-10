import { defineConfig } from 'vite';

// VITE_BUILD_TARGET=web  → GitHub Pages (절대 경로 필요)
// 미설정 또는 그 외      → Capacitor Android (./ 상대 경로 필요)
const isWebBuild = process.env.VITE_BUILD_TARGET === 'web';

export default defineConfig({
  base: isWebBuild ? '/sweet-crunch/' : './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 인라인 임계값: 4KB 이하 에셋은 base64 인라인
    assetsInlineLimit: 4096,
    // 청크 크기 경고 기준 상향 (Phaser는 원래 큼)
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Phaser를 별도 vendor 청크로 분리 → 게임 코드 캐시 효율 향상
        // 참고: Vite 8/Rolldown은 함수 형식만 지원 (객체 형식 불가)
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) {
            return 'vendor-phaser';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  // 공통 의존성 사전 번들링 (dev 서버 첫 실행 속도 향상)
  optimizeDeps: {
    include: ['phaser'],
  },
});
