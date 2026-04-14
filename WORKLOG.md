# Sweet Crunch — 작업 로그

## 2026-04-07

### D-1: 게임 컨셉 결정
- 디저트/베이커리 테마 Match-3 퍼즐 "Sweet Crunch" 컨셉 확정
- 6종 타일: cupcake, donut, macaron, croissant, icecream, chocolate
- 컬러 팔레트, 특수 타일, 메타게임, 레벨 시스템 기획
- `CONCEPT.md` 작성

### D-2: 해상도 / 그리드 규격 결정
- 1080x1920 (9:16 세로), 8x8 그리드, 타일 120px (108px + 12px gap)
- `SCREEN_SPEC.md` 작성

### D-3: UI 디자인 (Stitch)
- Stitch로 전체 화면 UI 생성 (3차 반복)
- V1: 실사 이미지 문제 → V2: 하단 네비게이션바/타일 색상 문제 → V3: 수정 완료
- 컬러 시스템 추출 (background, surface, primary, error 등)

### D-4: 타일 에셋 (임시)
- Recraft로 타일 생성 시도 → 품질 불만족
- 이모지로 임시 대체, 추후 재작업 예정

### S-0: 환경 세팅
- Vite + TypeScript + Phaser 3 프로젝트 초기화
- `package.json`, `tsconfig.json`, `index.html`, `CLAUDE.md` 작성
- Git 초기화

### P-1: 그리드 렌더링 + Stitch 디자인 적용
- Stitch HTML 기반 HUD 구현 (Goal, Score, Moves)
- 8x8 보드 배경 + 타일 생성 (이모지 플레이스홀더)
- 초기 매칭 방지 알고리즘 (`wouldCauseMatch`)
- HUD 크기 불일치 수정 (Stitch 원본 비율에 맞춤)
- 이모지 클리핑 수정 (padding 추가)

### P-2: 스왑 인터랙션
- 탭 방식: 타일 선택 (글로우 + 확대) → 인접 타일 클릭 → 스왑
- 드래그 방식: 타일 위에서 드래그 → 방향 감지 → 인접 타일 스왑
- 스왑 애니메이션 200ms (Sine.easeInOut)
- 유효하지 않은 스왑 → 스왑 후 되돌리기 애니메이션
- **버그 수정**: 잘못된 스왑 애니메이션 로직 (시각적 피드백 없음 → 항상 스왑 보여준 후 판정)
- **버그 수정**: 타일 클릭 핸들러 클로저 캡처 (스왑 후 좌표 불일치 → tileData 참조로 변경)

### P-3: 매칭 감지
- 가로/세로 3개 이상 연속 매칭 탐색 (`findAllMatches`)
- Set 기반 중복 제거

### P-4: 매칭 제거 + 낙하 + 채우기
- 제거 애니메이션: scale→0 + fade, 150ms (Back.easeIn)
- 중력 낙하: 열별 처리, Bounce.easeOut
- 새 타일: 보드 위에서 생성 → 낙하 애니메이션

### P-5: 캐스케이드
- 낙하 후 `findAllMatches` 재귀 호출
- 추가 매칭 없을 때까지 반복

### P-6: 점수 시스템 + UI
- 점수 계산: 3매치 100점 + 추가 타일당 +100, 캐스케이드 콤보 배수 (1x → 1.5x → 2x)
- 점수 팝업 애니메이션 (매칭 위치에서 떠오름)
- 이동 횟수 차감 (유효 스왑마다 -1), 5이하 빨간색 강조
- 목표 추적: 컵케이크 수집 → 프로그레스 바 실시간 업데이트
- 게임 종료: 목표 달성 "Level Clear!" / 이동 소진 "Game Over" 팝업 + Retry
- 게임 밸런스 상수 config.ts 분리 (INITIAL_MOVES, GOAL_COUNT, SCORE_BASE 등)

### P-6 폴리시
- 디버그 모드 OFF (`DEBUG_GRID = false`)
- 교착 상태(deadlock) 감지: 유효한 스왑이 없으면 자동 셔플 + "Shuffle!" 안내
- 점수 카운트업 애니메이션: 숫자가 부드럽게 올라가는 연출 (`tweens.addCounter`)
- 목표 프로그레스 바: 달성 시 초록색으로 변경, 텍스트 펀치 애니메이션
- 이동 횟수 마이너스 방지 (`Math.max(0, movesLeft)`)
- `hasValidMove()`: 모든 인접 스왑을 시뮬레이션하여 유효 스왑 존재 여부 확인
- `shuffleBoard()`: 타일 타입 셔플 → 매칭 없음 + 유효 스왑 있음 보장 → 등장 애니메이션

### P-7: 특수 젬
- `SpecialType` 추가 (lineBlast, bomb, colorBomb) — config.ts
- `TileData`에 `special?`, `lineDirection?` 필드 추가
- `specialGrid[][]` 병렬 배열 — grid와 함께 초기화/스왑/낙하/셔플 시 동기화
- **매칭 감지 리팩토링**: `findAllMatchGroups()` 구현
  - Phase A: 가로/세로 run 수집 (연속 3+ 같은 타입)
  - Phase B: 교차 run 병합 → L/T형 감지, 5매치 우선순위
  - Phase C: 단독 run → match3/match4/match5plus 분류
  - `findAllMatches()` 하위 호환 래퍼 유지
- **특수 젬 비주얼**: `addSpecialOverlay()` — 테두리 글로우 + 아이콘(🔥↔/↕, 💣, ✨)
- **특수 젬 생성**: `processMatchGroups()`에서 패턴별 스폰
  - match4 → lineBlast (방향 기억)
  - L/T형 → bomb
  - match5plus → colorBomb
  - 스폰 셀은 제거 대상에서 제외, scale-up 등장 애니메이션
- **특수 젬 발동**: `getActivationCells()` + `expandActivations()`
  - lineBlast: 행 또는 열 전체
  - bomb: 3x3 범위
  - colorBomb: 같은 타입 전체 (스왑 대상 타입)
  - 연쇄 발동: 큐 기반으로 특수 젬이 다른 특수 젬 트리거
- **특수+특수 조합**: `handleSpecialCombo()`
  - line+line → 십자, bomb+line → 3행3열, bomb+bomb → 5x5
  - color+line/bomb → 같은 타입 전부 제거, color+color → 전체 보드
- **trySwap 흐름 변경**: 특수 조합 → 컬러밤 직접발동 → 일반 매칭 순서
- **dropAndFill**: specialGrid도 함께 낙하, 새 타일은 special=null
- **shuffleBoard**: 특수 젬 위치 보존, 일반 타일만 셔플

### P-7 비주얼 폴리시: 매칭/특수 젬 이펙트
- 매칭 하이라이트: 흰색 플래시 + 스케일 펀치 → 제거 전 시각 피드백
- 웨이브 제거: 중심→바깥 순차 스태거 딜레이 (30ms/타일)
- 파티클 버스트: 타일 색상별 6개 원형 파티클 폭발
- Line Blast 이펙트: 가로/세로 빔 + 스파크 파티클
- Bomb 이펙트: 3단 충격파 링 + 중앙 플래시 + 파편 파티클
- Color Bomb 이펙트: 6색 무지개 링 + 골든 플래시 + ✨ 파티클
- 카메라 쉐이크: 특수 젬 종류별 강도 차등 (lineBlast<bomb<colorBomb)
- 점수 팝업 개선: 스케일 바운스 등장, 콤보 깊이별 크기/색상 변화

### P-8: 레벨 시스템 + 목표 조건
- **`src/data/levels.ts`**: LevelDef 인터페이스 + 20레벨 데이터
  - LevelGoal: type('collect'), tileType, count
  - LevelDef: level, moves, goals[], starThresholds[1성,2성,3성]
  - 4챕터 구성: 튜토리얼(1~5), 본격(6~10), 도전(11~15), 하드코어(16~20)
  - 레벨별 다른 목표 타일, 이동 횟수 감소, 수집량 증가
- **`src/data/progress.ts`**: localStorage 기반 진행도 저장
  - PlayerProgress: highestUnlocked, stars{}, highScores{}
  - updateLevelProgress(): 별 계산 + 최고기록 갱신 + 다음 레벨 해금
- **`src/scenes/LevelSelectScene.ts`**: 레벨 선택 화면
  - 4x5 그리드 레이아웃 (20레벨)
  - 해금/잠금/클리어 상태 시각 구분 (테두리, 자물쇠, 별)
  - 총 별 수 표시, 버튼 눌림 애니메이션
- **`src/scenes/GameScene.ts`** 주요 변경:
  - `init(data)`: 레벨 데이터 수신 + 전체 상태 리셋
  - INITIAL_MOVES/GOAL_TYPE/GOAL_COUNT 하드코딩 제거 → `currentLevel` 참조
  - HUD 동적화: 레벨 번호, 목표 아이콘/수량 모두 레벨 데이터 반영
  - 게임 오버 팝업: 별 표시 + 진행도 저장 + "Next Level"/"Levels" 버튼
- **`src/config.ts`**: 레벨 관련 상수 제거 (INITIAL_MOVES, GOAL_TYPE, GOAL_COUNT)
- **`src/main.ts`**: scene 배열을 main.ts에서 주입 (순환 참조 해결)
- **`src/scenes/BootScene.ts`**: → LevelSelectScene 라우팅
- 디버그 모드 OFF, 디버그 console.log 전부 제거
- 기존 TS 에러 수정 (tween.getValue() null 처리)

### P-8 폴리시: 레벨 선택 UX
- 현재 레벨(최고 해금 미클리어) 강조: 빨간 테두리 + 글로우 펄스 + "PLAY!" 라벨 + 바운스 애니메이션
- 클리어/잠금/현재 레벨 시각 구분 완성
- MOVES 텍스트 depth 수정 (원형 배경에 가려지던 문제 → depth 12)

### P-9: 사운드 + 씬 전환 폴리시
- **`src/utils/SoundManager.ts`**: Web Audio API 프로시저럴 SFX 싱글톤
  - 12종 효과음: swap, pop, cascade, specialCreate, lineBlast, bomb, colorBomb, invalidSwap, levelClear, gameOver, buttonClick, tileLand
  - OscillatorNode + GainNode 조합, 노이즈 버퍼 생성
  - 팝 쿨다운 (30ms) — 다량 팝 스팸 방지
  - 뮤트 토글 + localStorage 영구 저장
  - AudioContext 자동 재개 (브라우저 autoplay 정책 대응)
- **`src/utils/SceneTransition.ts`**: 페이드 전환 유틸
  - fadeToScene(): 배경색(#FFF8F3)으로 페이드 아웃 → 씬 전환
  - fadeIn(): 씬 create()에서 페이드 인
- **GameScene 사운드 훅 (10+곳)**:
  - trySwap: playSwap / playInvalidSwap
  - processMatchGroups: playPop + playCascade
  - 특수 젬 생성: playSpecialCreate
  - 특수 젬 발동: playLineBlast / playBomb / playColorBomb
  - dropAndFill 완료: playTileLand
  - 게임 종료: playLevelClear / playGameOver
- **LevelSelectScene**: 버튼 클릭 사운드 + 페이드 전환
- **뮤트 버튼**: 하단 바 🔊/🔇 토글 (기존 ⏸️ 대체)
- **씬 전환**: 모든 scene.start → fadeToScene 교체 (5곳)

---

*이후 작업은 여기에 계속 추가*
