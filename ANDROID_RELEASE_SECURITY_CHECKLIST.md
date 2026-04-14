# Android 출시 전 보안/배포 체크리스트

> 이 문서는 Sweet Crunch Android 출시 직전에 확인해야 할 최소 항목이다.
> 광고 실서비스 전환, 개인정보처리방침, UMP는 별도 작업이므로 이 문서에서 다루지 않는다.

---

## 1. 서명 키 / Keystore

- [ ] 업로드 키(`*.jks`, `*.keystore`)를 Git 저장소에 커밋하지 않았는지 확인
- [ ] `keystore.properties`(keystore 경로·비밀번호)를 Git에 커밋하지 않았는지 확인
- [ ] **Play App Signing 사용 권장** — Google이 앱 서명 키를 보관하고, 개발자는 업로드 키만 관리
  - Google Play Console → 앱 서명 → Play 앱 서명 등록
  - 업로드 키 분실 시 Google에서 새 업로드 키 재발급 가능 (앱 서명 키는 Google 보관)
- [ ] 업로드 키는 저장소 외부(안전한 오프라인 저장소, 비밀번호 매니저 등)에 별도 백업

---

## 2. AdMob 광고 ID

- [ ] `src/utils/AdMobManager.ts`: `USE_TEST_ADS = false` 로 변경
- [ ] `src/utils/AdMobManager.ts`: `PROD_BANNER_ID`를 실제 광고 단위 ID로 교체
- [ ] `capacitor.config.ts`: `plugins.AdMob.appId.android`를 실제 앱 ID로 교체
- [ ] `android/app/src/main/AndroidManifest.xml`: `APPLICATION_ID` 메타데이터를 실제 앱 ID로 교체
- 테스트 ID로 배포하면 Google 정책 위반 → 앱 스토어 거절 또는 광고 수익 미발생

---

## 3. 빌드 설정

- [ ] `versionCode` / `versionName` 확인 (`android/app/build.gradle`)
- [ ] `minSdkVersion` / `targetSdkVersion` 확인 (`android/variables.gradle`)
  - Play Store 제출 시 targetSdkVersion은 현재 요구 기준 이상이어야 함 (2025 기준 API 35)
- [ ] `android:debuggable`이 release 빌드에서 `false`인지 확인 (Gradle release 빌드 시 자동 적용됨)
- [ ] ProGuard/R8 활성화 여부 확인 (`android/app/build.gradle`의 `minifyEnabled`)

---

## 4. 권한 확인

현재 `AndroidManifest.xml` 권한:
- `INTERNET` — AdMob, Capacitor 네트워크 필수 ✅

불필요한 권한이 추가되지 않았는지 확인. 배포 전 권한 목록을 재검토할 것.

---

## 5. 실기기 최종 점검

- [ ] 광고 실제 표시 확인 (배너, 위치, 크기)
- [ ] 진행도 저장/불러오기 정상 동작 확인
- [ ] 앱 강제종료 후 재진입 시 진행도 유지 확인
- [ ] 뒤로가기 버튼 동작 확인
- [ ] 전체화면 / 풀스크린 모드 확인
- [ ] 다양한 화면 비율(16:9, 20:9 등) 레이아웃 확인

---

## 6. 개인정보 / UMP (별도 작업)

아래는 이번 체크리스트 범위 밖이다. 별도로 진행할 것.

- 개인정보처리방침 URL 설정
- UMP (User Messaging Platform) consent flow 구현
- Google Play 데이터 안전 섹션 작성

---

## 참고

- Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
- AdMob 정책: https://support.google.com/admob/answer/6223527
- targetSdkVersion 요구사항: https://support.google.com/googleplay/android-developer/answer/11926878
