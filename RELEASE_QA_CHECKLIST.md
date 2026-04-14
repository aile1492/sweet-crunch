# Sweet Crunch — Release QA Checklist

> 기준 브랜치: main
> 마지막 업데이트: 2026-04-10
> 빌드: Vite + Capacitor (Android)

---

## 1. 빌드 & 배포

| # | 항목 | 파일/명령 | 상태 |
|---|------|-----------|------|
| 1.1 | `npm run build` 오류 없이 완료되는지 | `vite.config.ts` | ☐ |
| 1.2 | `npx tsc --noEmit` 타입 오류 없음 | `tsconfig.json` | ☐ |
| 1.3 | dist/ 총 용량 ≤ 30MB | `dist/` 폴더 확인 | ☐ |
| 1.4 | vendor-phaser 청크 분리 확인 (manualChunks 함수 형식 필수) | `dist/assets/vendor-phaser-*.js` | ☐ |
| 1.5 | Capacitor Android 빌드 성공 | `npx cap sync android` | ☐ |
| 1.6 | APK 설치 후 화이트스크린 없음 | 실기기 테스트 | ☐ |

---

## 2. 씬 전환 & 로딩

| # | 항목 | 관련 파일 | 상태 |
|---|------|-----------|------|
| 2.1 | BootScene → TitleScene 전환 정상 | `src/scenes/BootScene.ts` | ☐ |
| 2.2 | TitleScene → LevelSelectScene 정상 | `src/scenes/TitleScene.ts` | ☐ |
| 2.3 | LevelSelectScene → GameScene 정상 | `src/scenes/LevelSelectScene.ts` | ☐ |
| 2.4 | GameScene → TitleScene (홈 버튼) 정상 | `src/scenes/GameScene.ts` | ☐ |
| 2.5 | 레벨 클리어 후 씬 전환 시 메모리 누수 없음 | GameScene.destroy() | ☐ |
| 2.6 | BGM 씬 전환 시 겹치지 않음 | `SoundManager` | ☐ |

---

## 3. 핵심 게임플레이

| # | 항목 | 관련 코드 | 상태 |
|---|------|-----------|------|
| 3.1 | 매칭 후 타일 낙하 정상 (빈 칸 없음) | `GameScene.ts:fallTiles()` | ☐ |
| 3.2 | 연쇄(cascade) 정상 동작 | `GameScene.ts:processMatches()` | ☐ |
| 3.3 | 특수젬 생성: Line(4개), Wrapped(2x2), ColorBomb(5개), Cross(+자) | `GameScene.ts` | ☐ |
| 3.4 | 특수젬 조합 (Line+Line, Line+Wrapped 등) 정상 폭발 | 실제 플레이 검증 | ☐ |
| 3.5 | 이동 횟수 0에서 게임오버 트리거 | `GameScene.ts:checkGameOver()` | ☐ |
| 3.6 | 목표 달성 시 클리어 연출 및 별 계산 정상 | `GameScene.ts:checkWin()` | ☐ |
| 3.7 | 유효한 이동 없을 시 셔플 발동 | `GameScene.ts:hasValidMove()` | ☐ |
| 3.8 | 셔플 후 재귀 무한루프 없음 (최대 5회 제한) | `GameScene.ts` | ☐ |

---

## 4. 장애물 동작

| # | 항목 | 상태 |
|---|------|------|
| 4.1 | 얼음 1겹: 직접 매칭 시 제거 | ☐ |
| 4.2 | 얼음 2겹: 2회 매칭 시 제거 | ☐ |
| 4.3 | 얼음 위 특수젬 사용 시 1겹 감소 | ☐ |
| 4.4 | 체인: 인접 매칭 1회로 해제 | ☐ |
| 4.5 | 돌: 인접 매칭 3회로 제거 (크랙 2단계 시각화 포함) | ☐ |
| 4.6 | 타이머 젬: 매 이동마다 카운터 감소 | ☐ |
| 4.7 | 타이머 젬 카운터 0: 폭발 연출 후 주변 타일 피해 | ☐ |
| 4.8 | 목표 카운터(UI) 장애물 제거 시 정확히 갱신 | ☐ |

---

## 5. 진행도 & 저장

| # | 항목 | 관련 파일 | 상태 |
|---|------|-----------|------|
| 5.1 | 레벨 클리어 시 별점 localStorage 저장 | `src/data/progress.ts` | ☐ |
| 5.2 | 앱 재시작 후 별점 복원 | `progress.ts:loadProgress()` | ☐ |
| 5.3 | LevelSelectScene 잠금/해금 상태 정확 | `LevelSelectScene.ts` | ☐ |
| 5.4 | 최고 점수 갱신 시 올바르게 저장 | `progress.ts` | ☐ |
| 5.5 | localStorage quota 초과 예외 처리 존재 | `progress.ts` | ☐ |

---

## 6. 사운드 & 이펙트

| # | 항목 | 관련 파일 | 상태 |
|---|------|-----------|------|
| 6.1 | sfx 19개 파일 모두 로드됨 | `BootScene.ts` 키 목록 | ☐ |
| 6.2 | 볼륨 슬라이더 작동 | `SettingsScene.ts` | ☐ |
| 6.3 | 음소거 시 모든 사운드 중단 | `SoundManager` | ☐ |
| 6.4 | 파티클 이펙트(매치, 폭발) 렌더됨 | `public/assets/fx/` | ☐ |
| 6.5 | FX 이펙트 씬 전환 후 재사용 시 오류 없음 | `GameScene.shutdown()` | ☐ |

---

## 7. UI & 접근성

| # | 항목 | 상태 |
|---|------|------|
| 7.1 | 목표 게이지 바 정확히 채워짐 | ☐ |
| 7.2 | 별점 표시(1/2/3개) 점수 기준 정상 | ☐ |
| 7.3 | 이동 횟수 표시가 실제 잔여 이동과 동기화됨 | ☐ |
| 7.4 | 힌트 부스터 버튼: 사용 후 쿨다운/비활성화 정상 | ☐ |
| 7.5 | 자동 힌트(8초 shimmer → 15초 방향 표시) 타이밍 정상 | ☐ |
| 7.6 | 튜토리얼 팝업 표시/자동 닫힘 정상 | `src/data/tutorials.ts` | ☐ |
| 7.7 | 1080x1920 해상도에서 UI 잘림 없음 | Scale.FIT | ☐ |
| 7.8 | 노치/상태바 영역 UI 겹침 없음 | Capacitor 안전 영역 | ☐ |

---

## 8. 알려진 출시 리스크

### 8.1 높음 (차단 수준)
- **타이머 젬 폭발 데미지 범위 검증 필요**: `GameScene.ts` 타이머 젬 폭발 시 인접 장애물에도 대미지 적용되는지 L44-49에서 실제 확인 요망
- **GameScene 메모리 누수 가능성**: `destroy()` 시 모든 tweens/timers 정리되는지 확인 (장기 플레이 세션 대상)

### 8.2 중간
- **localStorage 가용성**: 일부 브라우저/WebView에서 Private 모드 시 quota 오류 가능 — try/catch 없으면 게임 중단됨
- **L50 milestone 보드**: `mixedBoard()` 팩토리로 생성 — 실제 렌더링 및 돌 4개 목표 달성 가능성 수동 플레이 검증 필요

### 8.3 낮음
- **tutorialStep `autoAdvanceMs`**: 느린 기기에서 애니메이션 완료 전에 튜토리얼이 닫힐 수 있음
- **LevelSelectScene 스크롤**: 100레벨 확장 후 스크롤 영역/퍼포먼스 확인 필요

---

## 9. 금지 항목 (수정 금지)

> 아래 항목은 출시 직전에 절대 수정하지 말 것

- AdMob 프로덕션 App ID / Ad Unit ID
- UMP(동의) 플로우 코드
- Privacy Policy URL
- Google Play 서명 키스토어

