# Game Overview

> Sweet Crunch — 디저트 테마 Match-3 캐주얼 퍼즐 게임의 전체 컨셉과 방향 <!-- coverage: high -->

## Purpose
<!-- coverage: high -->
**Sweet Crunch**는 25~45세 여성 캐주얼 게이머를 타깃으로 한 디저트/베이킹 테마의 Match-3 퍼즐 모바일 게임이다.

- **플랫폼:** Android / iOS (Capacitor 래핑)
- **세션 길이:** 레벨당 2~3분
- **컨셉 키워드:** Cozy, Minimal, Satisfying, Bite-sized
- **수익 모델:** 광고(배너/보상형/인터스티셜) + IAP(부스터, 라이프)

## Architecture
<!-- coverage: high -->
```
Phaser 3 (v3.90+) + TypeScript + Vite
         ↓
    Capacitor 8.x
         ↓
Android APK / iOS IPA
```
기준 해상도 1080×1920 (9:16 세로), Phaser Scale.FIT + CENTER_BOTH 사용.

## Game Mechanics
<!-- coverage: high -->
- **그리드:** 8×8, 타일 6종 (cupcake, donut, macaron, croissant, icecream, chocolate)
- **기본 규칙:** 인접 타일 스왑 → 3개 이상 매칭 → 제거 → 중력 낙하 → 새 타일 → 연쇄(cascade)
- **이동 제한:** 레벨별 이동 횟수 제한 (시간 제한 없음)
- **유효하지 않은 스왑:** 매칭 발생 안 되면 원위치 복귀

특수 타일 3종:
| 조건 | 생성 | 효과 |
|------|------|------|
| 4개 일렬 | lineBlast (Rolling Pin) | 가로/세로 한 줄 전체 제거 |
| L/T자 | bomb (Oven Bomb) | 3×3 범위 제거 |
| 5개 일렬 | colorBomb (Golden Whisk) | 같은 종류 전체 제거 |

추가 특수 타일:
- **crossBlast:** 가로+세로 동시 제거
- **wrapped:** 2단계 폭발 (발동 + 캐스케이드 시 재폭발)

장애물 (레벨 6+):
| 레벨 | 장애물 | 설명 |
|------|--------|------|
| 6+ | ice (1~3겹) | 인접 매칭으로 겹씩 제거 |
| 11+ | chain | 스왑 불가, 인접 매칭으로 해제 |
| 16+ | stone (1~2겹) | 인접 매칭으로 파괴 |
| 43+ | timedGem | N턴 후 자동 폭발 |

## UI & Visual
<!-- coverage: high -->
**디자인 테마:** "The Artisanal Patisserie" — 부티크 베이커리 메뉴 같은 고급 에디토리얼 스타일

주요 컬러:
- Background: `#FFF8F3` (웜 크림)
- Primary: `#690008` (체리 레드)
- Surface Container Highest: `#EFE0CD` (베이지)

아트 스타일: 플랫 디자인, 둥근 형태, 소프트 그라데이션, 파스텔 톤

## Key Decisions
<!-- coverage: high -->
- **Phaser 3 선택:** 빠른 2D 게임 개발, Canvas/WebGL 자동 선택, 풍부한 Tween/Physics API
- **Capacitor 선택:** 웹 기술 스택 그대로 네이티브 앱 생성, React Native 대비 단순한 구조
- **이동 제한 방식:** 시간 제한 대비 전략성 강조, 캐주얼 유저 스트레스 감소
- **파스텔 톤 강제:** 여성 타깃 선호도, 색약 접근성 (형태+색상 이중 구분)
- **디자인 퍼스트 개발 방식:** Stitch로 전체 UI 먼저 설계 후 Phaser 변환

## Gotchas
<!-- coverage: medium -->
- Phaser Scale.FIT는 캔버스 크기를 실제 화면에 맞게 축소하므로, 실제 픽셀 좌표 ≠ CSS 픽셀
- 풀스크린 모드에서 상태바/홈 인디케이터 영역 처리는 `MainActivity.java`에서 WindowInsets API로 처리
- AdMob 배너 광고는 Capacitor WebView 위 네이티브 레이어로 오버레이됨 — Phaser 캔버스 하단 200px 공간을 항상 비워둬야 함
- 이모지 렌더링은 플랫폼마다 다름 — 현재 타일 에셋은 임시 이모지, 추후 실제 스프라이트로 교체 예정

## Sources
- [CONCEPT.md](../CONCEPT.md) — 게임 전체 컨셉 기획서
- [DESIGN.md](../DESIGN.md) — 아트/디자인 시스템 가이드
- [CLAUDE.md](../CLAUDE.md) — 기술 스택, 코딩 컨벤션
- [PHASES.md](../PHASES.md) — 개발 단계 및 진행 상태
- [WORKLOG.md](../WORKLOG.md) — 일자별 상세 작업 로그

---
*Last compiled: 2026-04-10 · 5 sources*
