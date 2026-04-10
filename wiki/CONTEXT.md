# Wiki 사용 가이드 — Sweet Crunch

이 위키는 Sweet Crunch 프로젝트의 지식을 압축한 참고서다.
원본 파일을 매번 읽는 대신, 위키 기사를 먼저 확인하면 토큰을 대폭 절약할 수 있다.

---

## 어떤 기사를 읽어야 하나?

| 작업 유형 | 읽어야 할 기사 |
|-----------|---------------|
| 게임 컨셉/방향 이해 | [Game Overview](topics/game-overview.md) |
| 새 씬/UI 개발 | [Design System](topics/design-system.md) + [UI Scenes](topics/ui-scenes.md) |
| 게임플레이 로직 수정 | [Game Scene](topics/game-scene.md) |
| 레벨/난이도 조정 | [Level System](topics/level-system.md) |
| 이펙트/사운드 작업 | [Special FX](topics/special-fx.md) |
| 광고/수익 관련 | [Monetization](topics/monetization.md) |
| 빌드/환경 설정 | [Tech Stack](topics/tech-stack.md) |
| Phaser 패턴 참고 | [Phaser 3 패턴](concepts/phaser-patterns.md) |
| UX 방향 결정 | [디저트 게임 UX 원칙](concepts/dessert-game-ux.md) |

---

## Coverage 레벨 이해

기사 내 각 섹션에 커버리지 태그가 있다:

- `<!-- coverage: high -->` — 5개+ 소스로 합성. **신뢰할 수 있음**, 원본 파일 읽지 않아도 됨
- `<!-- coverage: medium -->` — 2~4개 소스. 개요 제공, 세부사항은 Sources 파일 확인
- `<!-- coverage: low -->` — 0~1개 소스. 반드시 원본 파일 직접 확인 필요

---

## 위키 갱신

소스 파일을 수정했다면:
```
/wiki-compile           # 변경된 토픽만 증분 업데이트
/wiki-compile --full    # 전체 재컴파일
/wiki-compile --topic game-scene  # 특정 토픽만
```

특정 내용 검색:
```
/wiki-search AdMob
/wiki-search 특수 젬
```

위키로 질문하기:
```
/wiki-query "GameScene에서 스왑 처리 흐름은?"
/wiki-query "배포 전 뭘 교체해야 해?"
```

---

## 원본 파일 직접 읽어야 할 때

위키 Coverage가 `low`이거나, 구체적인 코드 라인이 필요할 때만 원본 파일을 읽는다:

- 정확한 메서드 시그니처 → `src/scenes/GameScene.ts`
- 레벨별 상세 데이터 → `src/data/levels.ts`
- 진행도 저장 로직 → `src/data/progress.ts`
- 셰이더 GLSL 코드 → `src/shaders/RainbowPipeline.ts`
