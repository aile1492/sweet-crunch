/**
 * AdMobManager — 배너 광고 싱글턴 관리자
 *
 * - 네이티브 환경(Capacitor): @capacitor-community/admob 플러그인으로 실제 AdMob 배너 표시
 * - 웹 환경(개발 서버): 아무 동작 없이 조용히 무시
 *
 * 사용 방법:
 *   AdMobManager.initialize();          // 앱 시작 시 1회
 *   AdMobManager.showBanner();          // 씬 create()에서 호출
 *   AdMobManager.hideBanner();          // 씬 shutdown()에서 호출 (선택)
 *   AdMobManager.removeBanner();        // 씬 전환 등으로 완전 제거 시
 */

// ── AdMob 광고 단위 ID ──────────────────────────────────────────
// 테스트 기간에는 테스트 ID를 사용하세요.
// 실제 배포 시 아래 PROD_* 상수를 Google AdMob 콘솔에서 발급받은 ID로 교체하세요.
const TEST_BANNER_ID   = 'ca-app-pub-3940256099942544/6300978111';  // Google 공식 테스트 배너 ID
const PROD_BANNER_ID   = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';  // TODO: 실제 배너 광고 단위 ID 교체

const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';  // Google 공식 테스트 리워드 ID
const PROD_REWARDED_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';  // TODO: 실제 리워드 광고 단위 ID 교체

const USE_TEST_ADS = true;  // 배포 전 false 로 변경

const BANNER_AD_ID   = USE_TEST_ADS ? TEST_BANNER_ID   : PROD_BANNER_ID;
const REWARDED_AD_ID = USE_TEST_ADS ? TEST_REWARDED_ID : PROD_REWARDED_ID;

// ── Capacitor 환경 감지 ────────────────────────────────────────
function isNative(): boolean {
  return typeof (window as any).Capacitor !== 'undefined'
    && (window as any).Capacitor.isNativePlatform?.() === true;
}

// ── 상태 ──────────────────────────────────────────────────────
let initialized = false;
let bannerVisible = false;

// ── 초기화 ────────────────────────────────────────────────────
export async function initAdMob(): Promise<void> {
  if (initialized || !isNative()) return;

  try {
    const { AdMob, MaxAdContentRating } = await import('@capacitor-community/admob');

    await AdMob.initialize({
      // 테스트 기기 등록: https://developers.google.com/admob/android/test-ads#enable-test-ads
      testingDevices: [],
      initializeForTesting: USE_TEST_ADS,
      // 광고 콘텐츠 상한을 전체연령(G)으로 제한.
      // 게임 이용등급과 무관하게 광고 내용 자체를 안전하게 유지하기 위한 설정이다.
      // ※ tagForChildDirectedTreatment(COPPA) / tagForUnderAgeOfConsent(TFUA)와는 목적이 다르며,
      //    법적 판단 없이 임의로 설정하지 않는다.
      maxAdContentRating: MaxAdContentRating.General,
    });

    initialized = true;
    console.log('[AdMob] 초기화 완료');
  } catch (err) {
    console.warn('[AdMob] 초기화 실패:', err);
  }
}

// ── 배너 표시 ─────────────────────────────────────────────────
export async function showBanner(): Promise<void> {
  if (!isNative()) return;
  if (!initialized) await initAdMob();
  if (bannerVisible) return;

  try {
    const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');

    await AdMob.showBanner({
      adId: BANNER_AD_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: USE_TEST_ADS,
    });

    bannerVisible = true;
    console.log('[AdMob] 배너 표시');
  } catch (err) {
    console.warn('[AdMob] 배너 표시 실패:', err);
  }
}

// ── 배너 숨김 (레이아웃 유지, 노출만 중단) ──────────────────────
export async function hideBanner(): Promise<void> {
  if (!isNative() || !bannerVisible) return;

  try {
    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.hideBanner();
    bannerVisible = false;
    console.log('[AdMob] 배너 숨김');
  } catch (err) {
    console.warn('[AdMob] 배너 숨김 실패:', err);
  }
}

// ── 배너 제거 (완전 제거) ─────────────────────────────────────
export async function removeBanner(): Promise<void> {
  if (!isNative()) return;

  try {
    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.removeBanner();
    bannerVisible = false;
    console.log('[AdMob] 배너 제거');
  } catch (err) {
    console.warn('[AdMob] 배너 제거 실패:', err);
  }
}

// ── 리워드 광고 ───────────────────────────────────────────────
// 광고를 끝까지 시청하면 onRewarded(), 로드 실패·중간 스킵이면 onFailed() 호출.
// 광고가 실제로 화면에 표시되는 순간 onAdShowed()를 호출한다 (BGM 정지 타이밍).
// 웹 환경(개발 서버)에서는 onAdShowed() → onRewarded() 순으로 즉시 호출해 개발 편의를 유지한다.
export async function showRewardedAd(
  onRewarded: () => void,
  onFailed: () => void,
  onAdShowed?: () => void,  // 광고 화면 표시 시점 (BGM 정지 등에 활용)
): Promise<void> {
  // 웹 환경: 즉시 보상 (개발·테스트 편의)
  if (!isNative()) {
    onAdShowed?.();
    onRewarded();
    return;
  }

  if (!initialized) await initAdMob();

  try {
    const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');

    let rewarded = false;

    // 리워드 수령 리스너
    const rewardListener = await AdMob.addListener(
      RewardAdPluginEvents.Rewarded,
      () => {
        rewarded = true;
        rewardListener.remove();
        console.log('[AdMob] 리워드 수령');
        onRewarded();
      },
    );

    // 광고 표시 리스너 — 광고가 실제로 화면에 뜬 순간
    const showedListener = await AdMob.addListener(
      RewardAdPluginEvents.Showed,
      () => {
        showedListener.remove();
        console.log('[AdMob] 리워드 광고 표시됨');
        onAdShowed?.();
      },
    );

    // 광고 닫힘 리스너 (시청 완료 또는 스킵)
    const dismissListener = await AdMob.addListener(
      RewardAdPluginEvents.Dismissed,
      () => {
        dismissListener.remove();
        if (!rewarded) {
          // 끝까지 보지 않고 닫은 경우
          console.log('[AdMob] 리워드 광고 스킵');
          onFailed();
        }
      },
    );

    // 광고 로드 실패 리스너
    const failListener = await AdMob.addListener(
      RewardAdPluginEvents.FailedToLoad,
      (err: unknown) => {
        failListener.remove();
        rewardListener.remove();
        showedListener.remove();
        dismissListener.remove();
        console.warn('[AdMob] 리워드 광고 로드 실패:', err);
        onFailed();
      },
    );

    // 광고 준비
    await AdMob.prepareRewardVideoAd({
      adId: REWARDED_AD_ID,
      isTesting: USE_TEST_ADS,
    });

    // 광고 표시
    await AdMob.showRewardVideoAd();
    console.log('[AdMob] 리워드 광고 요청됨');
  } catch (err) {
    console.warn('[AdMob] 리워드 광고 오류:', err);
    onFailed();
  }
}
