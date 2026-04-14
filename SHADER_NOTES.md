# WebGL / Shader 효과 참고 노트

## 현재 프로젝트 설정

- **렌더러:** `Phaser.AUTO` (WebGL 우선, Canvas 폴백)
- **Phaser:** v3.90.0
- **글로우 구현:** Graphics API로 반투명 원 겹치기 (쉐이더 미사용)

---

## 환경별 WebGL 지원

| 환경 | WebGL 1.0 | WebGL 2.0 | 비고 |
|---|---|---|---|
| 데스크톱 Chrome | O | O | 최적 |
| iOS Safari / WKWebView | O | O | 안정적 |
| Android Chrome (브라우저) | O | O | 안정적 |
| Android WebView (Capacitor) | O | O (7+) | 성능 저하, GPU 블랙리스트 차이 |
| Android 에뮬레이터 | 불안정 | 불안정 | 실기기 테스트 필수 |

---

## Phaser 3.x PostFX 쉐이더 — Android 이슈

### 알려진 버그

| 이슈 | 증상 | 참고 |
|---|---|---|
| 녹색 틴트 | PreFX(glow, shadow) 적용 시 녹색 빛 발생 | [#6466](https://github.com/phaserjs/phaser/issues/6466) |
| 회색 사각형 | FX 적용 오브젝트가 Android 13에서 회색 박스로 렌더링 | [#7086](https://github.com/phaserjs/phaser/issues/7086) |
| 리사이즈 왜곡 | PostFX가 캔버스 리사이즈 시 이미지 찌그러짐 | [#6503](https://github.com/phaserjs/phaser/issues/6503) |
| Mali GPU WebGL2 | Mali GPU에서 WebGL 2.0 렌더링 깨짐 | Chromium 버그 |

### 수정 상태

- **Phaser 4.0.0에서 수정됨**
- Phaser 3.87+ 백포트 시도했으나 기기별로 여전히 발생 가능
- **현재 v3.90에서는 안전하지 않음**

---

## 성능 기대치

| 환경 | FPS |
|---|---|
| 데스크톱 Chrome | 60 |
| iOS WKWebView | 60 |
| Android Chrome | 50-60 |
| Android WebView (Capacitor) | 30-50 (중저가폰) |

Android WebView는 같은 기기의 Chrome보다 WebGL 성능이 낮음 (GPU 래스터 설정, 블랙리스트 차이).

---

## 글로우 효과 구현 방식 비교

| 방식 | 장점 | 단점 | Android 안전성 |
|---|---|---|---|
| **Graphics API (현재)** | 성능 좋음, 모든 환경 동작 | 진짜 빛 번짐 아님 | 안전 |
| **preFX.addGlow()** | 진짜 쉐이더 글로우 | Android 렌더링 버그 | 위험 (3.x) |
| **글로우 스프라이트** | 사전 렌더링으로 안정적 | 에셋 추가 필요 | 안전 |
| **Tween + Alpha** | 간단, 가벼움 | 표현 제한 | 안전 |

---

## 권장 사항

1. **현재 방식 유지** — Graphics API 반투명 원 글로우가 가장 안전
2. **PostFX 쉐이더는 Phaser 4.0 업그레이드 후 재검토**
3. 더 화려한 글로우가 필요하면 **사전 렌더링된 글로우 스프라이트** 사용 권장
4. Android 빌드 후 **반드시 실기기에서 테스트** (에뮬레이터 WebGL 불안정)

---

*작성일: 2026-04-08*
