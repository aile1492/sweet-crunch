# Special FX & Visual Effects

> 특수 젬 이펙트, 파티클, 셰이더, 사운드 시스템 <!-- coverage: high -->

## Purpose
<!-- coverage: high -->
Sweet Crunch의 비주얼 이펙트는 "폭발감"보다 "예쁜 만족감"을 우선한다.
디저트 게임의 감성에 맞게 크림, 글레이즈, 리본, 하트, 별빛 같은 재료를 사용한다.

## Architecture
<!-- coverage: high -->
**FX 시스템 구성:**
```
src/shaders/RainbowPipeline.ts    ← PostFX 셰이더 (colorBomb, wrapped용)
src/utils/SoundManager.ts         ← Web Audio API 합성 SFX
public/assets/fx/                 ← 파티클/스프라이트 텍스처
  kenney_particle-pack/           ← 글로우, 스타, 링, 스파크
  kenney_light-masks-1.0/         ← 글로우 스트릭, 링 마스크
  feminine/                       ← bubble_512, heart_effect, poof_spritesheet
  brackeys_vfx_bundle/            ← vortex_6x5.png
```

**셰이더 파이프라인 (`RainbowPipeline.ts`):**
- `RainbowPipeline`: colorBomb 무지개 효과
- `ShockwavePipeline`: 충격파 왜곡 효과
- `ShimmerPipeline`: 반짝임 효과

## API Surface
<!-- coverage: high -->
**SoundManager 싱글턴 (`src/utils/SoundManager.ts`):**
```typescript
SoundManager.getInstance().setScene(scene)
// 12종 메서드:
.playSwap()           // 타일 스왑
.playPop()            // 매칭 팝 (30ms 쿨다운)
.playCascade()        // 캐스케이드
.playSpecialCreate()  // 특수 젬 생성
.playLineBlast()      // 라인 블라스트
.playBomb()           // 봄
.playColorBomb()      // 컬러 봄
.playInvalidSwap()    // 유효하지 않은 스왑
.playLevelClear()     // 레벨 클리어
.playGameOver()       // 게임 오버
.playButtonClick()    // 버튼 클릭
.playTileLand()       // 타일 낙하 완료
.toggleMute()         // 뮤트 토글 (localStorage 영구 저장)
.ensureContext()      // AudioContext 재개 (브라우저 autoplay 정책)
```

**UserSettings 유틸 (`src/utils/UserSettings.ts`):**
```typescript
isReducedMotionEnabled(): boolean  // 모션 감소 설정
getMotionFactor(): number          // 0.0~1.0 모션 강도 계수
vibrateCelebrate(), vibrateSpecial(), vibrateTap()  // 진동 피드백
```

## Game Mechanics
<!-- coverage: high -->
**특수 젬별 이펙트 방향 (SPECIAL_FX_PLAN.md 기준):**

| 특수 젬 | 시각 방향 | 색상 | 파티클 |
|---------|-----------|------|--------|
| **lineBlast** | 글레이즈 리본 빔 + 설탕가루 | 현재 유지 | fx_twinkle, fx_petal |
| **bomb** | 휘핑크림 퍼짐 (공격적 폭발 X) | 크림 핑크, 연한 로즈 | poof 스프라이트, 하트+별 |
| **colorBomb** | 소용돌이 + 셔벗 파스텔 무지개 | 원색 X, 셔벗 파스텔 | fx_bubble, vortex |
| **crossBlast** | 리본 교차 + 꽃잎 | 연보라, 밀키 라벤더 | fx_petal |
| **wrapped** | 리본 풀림 → poof 확산 | 민트, 크림, 아이보리 | 1차+2차 강도 차별 |

**공통 이펙트 구조 (3단계):**
1. **예고:** 60~120ms 팽창 + 광택 상승 + 색 강조
2. **메인 발동:** 특수 젬별 고유 패턴
3. **잔광:** 작은 파티클 + 부드러운 fade-out

**아이들 FX (대기 상태):**
- 모든 특수 젬: 약한 breathing glow
- lineBlast: 짧은 방향성 shimmer
- bomb: 느린 pulse
- colorBomb: 약한 소용돌이 / 컬러 점멸
- crossBlast: 중심 교차 빛 반짝임
- wrapped: 리본 매듭 호흡감

**카메라 쉐이크 강도:** lineBlast < bomb < colorBomb

**매칭 이펙트:**
- 흰색 플래시 + 스케일 펀치 (제거 전 시각 피드백)
- 웨이브 제거: 중심→바깥 순차 스태거 (30ms/타일)
- 파티클 버스트: 타일 색상별 6개 원형 파티클

## Key Decisions
<!-- coverage: high -->
- **Web Audio API 합성 사운드:** 외부 파일 없이 OscillatorNode + GainNode로 직접 생성 — 앱 크기 절약
- **팝 쿨다운 30ms:** 다량 팝 스팸 방지 (캐스케이드 시 동시 수십 개 팝 방지)
- **RainbowPipeline 절제 사용:** 강도를 낮게 유지 — 눈 피로 방지, 디저트 무드 유지
- **`isReducedMotionEnabled` 지원:** 접근성 고려, 모션 강도 계수 0.0~1.0으로 조절 가능

## Gotchas
<!-- coverage: medium -->
- `SoundManager.ensureContext()` 반드시 사용자 인터랙션 이후에 호출 — 브라우저 autoplay 정책으로 직접 `AudioContext` 생성 불가
- poof 스프라이트시트, vortex 등 일부 텍스처는 BootScene에서 로드되지만 실제 발동 연출에 **아직 연결 안 된** 것들이 있음 (SPECIAL_FX_PLAN 기준)
- Kenney 오디오 폴더들 (`kenney_ui-audio`, `kenney_interface-sounds`, `kenney_impact-sounds`)은 프로젝트 루트에 있으나 아직 BootScene에 연결 안 됨 — 향후 합성→파일 교체 예정

## Sources
- [src/utils/SoundManager.ts](../src/utils/SoundManager.ts) — Web Audio SFX 싱글턴
- [src/shaders/RainbowPipeline.ts](../src/shaders/RainbowPipeline.ts) — PostFX 셰이더
- [SPECIAL_FX_PLAN.md](../SPECIAL_FX_PLAN.md) — 이펙트 방향 기준서
- [SHADER_NOTES.md](../SHADER_NOTES.md) — 셰이더 구현 메모
- [src/scenes/BootScene.ts](../src/scenes/BootScene.ts) — 텍스처/오디오 로딩
- [src/utils/UserSettings.ts](../src/utils/UserSettings.ts) — 접근성 설정

---
*Last compiled: 2026-04-10 · 6 sources*
