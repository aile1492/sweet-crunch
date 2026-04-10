# Sweet Crunch — Knowledge Wiki Index

> Compiled 2026-04-10 · 6 topics · 2 concepts · 27 sources

---

## Topics

| Topic | Sources | Coverage | Description |
|-------|---------|----------|-------------|
| [Game Overview](topics/game-overview.md) | 5 | high | 게임 컨셉, 장르, 타깃, 수익 모델 전체 요약 |
| [Tech Stack](topics/tech-stack.md) | 5 | high | Phaser 3 + TypeScript + Vite + Capacitor 아키텍처 |
| [Game Scene](topics/game-scene.md) | 5 | high | 6000줄+ 메인 게임플레이 씬 — 알고리즘, API, 상태 관리 |
| [Level System](topics/level-system.md) | 4 | high | 50레벨 데이터, 장애물, 진행도 저장 (localStorage) |
| [UI Scenes](topics/ui-scenes.md) | 5 | high | Boot/Title/LevelSelect/Settings 씬 구조 |
| [Special FX](topics/special-fx.md) | 6 | high | 특수 젬 이펙트, 파티클, 셰이더, SoundManager |
| [Monetization](topics/monetization.md) | 6 | high | AdMob 배너/보상형, IAP 설계, 배포 전 체크리스트 |
| [Design System](topics/design-system.md) | 4 | high | 컬러 팔레트, 타이포그래피, Stitch→Phaser 변환 규칙 |

---

## Concepts

| Concept | Related Topics | Description |
|---------|---------------|-------------|
| [Phaser 3 패턴](concepts/phaser-patterns.md) | game-scene, ui-scenes, tech-stack | 프로젝트 전반 공통 Phaser 구현 패턴 |
| [디저트 게임 UX 원칙](concepts/dessert-game-ux.md) | game-overview, design-system, special-fx | 여성 타깃 캐주얼 게임 UX/비주얼 방향성 |

---

## Quick Reference

**현재 개발 상태 (2026-04-10):**
- P-1~P-9 완료 (그리드, 스왑, 매칭, 캐스케이드, 특수젬, 레벨, 사운드, 씬전환)
- P-10 진행 중: Capacitor 래핑 + AdMob 배너 구현 완료
- 미완료: 특수젬 이펙트 퀄리티업(SPECIAL_FX_PLAN), 타일 실제 스프라이트, 보상형 광고, IAP

**배포 전 필수 사항:**
1. AdMobManager.ts: `PROD_BANNER_ID`, `USE_TEST_ADS = false`
2. capacitor.config.ts: 실제 AdMob 앱 ID
3. AndroidManifest.xml: 실제 앱 ID

---

*Use `/wiki-search {query}` to find specific content*
*Use `/wiki-query {question}` to ask questions*
*Use `/wiki-lint` to check for stale or missing content*
*Use `/wiki-compile --full` to recompile all topics*
