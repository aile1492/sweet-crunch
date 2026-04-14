# Sweet Crunch 레벨 1~100 설계 초안표

## 문서 목적

이 문서는 `1~100` 레벨을 실제로 제작하거나 수동 수정할 때 사용할 `설계 초안표`다.

이 표는 아래를 고정하기 위한 문서다.

- 각 레벨의 역할
- 어떤 메커닉을 가르치는지
- 어떤 압박을 쓰는지
- 쉬는 레벨과 시험 레벨이 어디인지
- 어떤 구간에서 어떤 플레이 감각을 만들어야 하는지

이 문서는 `수치 확정표`가 아니다.

즉, 아래 값은 실제 구현하면서 조정 가능하다.

- moves
- collect count
- star thresholds
- blocker cell count

하지만 아래 값은 최대한 유지하는 것을 권장한다.

- 레벨 역할
- 메커닉 순서
- 포드 리듬
- teach / relief / spike / milestone 배치

---

## 읽는 법

### Role

- `Teach`: 새 규칙 소개
- `Refresh`: 이전 규칙 리마인드
- `Apply`: 응용
- `Relief`: 쉬는 레벨
- `Test`: 작은 시험
- `Spike`: 해당 포드의 최고 압박
- `Milestone`: 포드 마감 / 기억에 남는 레벨

### Goal Shape

- `Collect`
- `Collect + Ice`
- `Collect + Stone`
- `Collect + Mixed`

### Intent

- 이 레벨에서 플레이어가 무엇을 느껴야 하는지

---

## Band 1: 레벨 1~50

### Pod 01: 레벨 1~10

목적:

- 기본 조작
- 4색 보드 적응
- 첫 ice 소개

| Lv | Role | Goal Shape | Main Focus | Intent |
|----|------|------------|------------|--------|
| 1 | Teach | Collect | 첫 3매치 | 조작과 성공 감각 학습 |
| 2 | Refresh | Collect | 기본 매치 반복 | 실패 부담 없이 익숙해지기 |
| 3 | Teach | Collect | 첫 special 개념 | 큰 매치가 더 좋다는 인식 |
| 4 | Apply | Collect | lineBlast 활용 암시 | special을 써 보면 좋다는 감각 |
| 5 | Relief | Collect | 5색 첫 진입 | 새 색상 적응, 축제형 쉬는 레벨 |
| 6 | Teach | Collect | 첫 ice | ice는 직접 깨야 한다는 규칙 학습 |
| 7 | Apply | Collect | ice 여러 개 | 얼음 우선순위 읽기 |
| 8 | Apply | Collect | 외곽 ice | 보드 위치에 따라 난이도 달라짐 체감 |
| 9 | Test | Collect | ice + 일반 매치 효율 | 같은 턴에 여러 가치 만들기 |
| 10 | Milestone | Collect | Pod 01 총정리 | 첫 포드 마감, 무리하지 않는 성취감 |

### Pod 02: 레벨 11~20

목적:

- chain 소개
- stone 소개
- 5색 후반에서 6색 전환 준비

| Lv | Role | Goal Shape | Main Focus | Intent |
|----|------|------------|------------|--------|
| 11 | Teach | Collect | 첫 chain | chain은 옆에서 풀어야 함 학습 |
| 12 | Apply | Collect | chain 위치 읽기 | 이동 자유 확보의 중요성 이해 |
| 13 | Apply | Collect | chain 밀도 증가 | 막힌 보드 해법 찾기 |
| 14 | Test | Collect | chain 응용 | 급하게 두면 손해라는 체감 |
| 15 | Relief | Collect | chain 정리형 레벨 | special이 잘 터지는 쉬는 레벨 |
| 16 | Teach | Collect | 첫 stone | stone은 장기 목표라는 인식 |
| 17 | Apply | Collect | stone 반복 타격 | 한 번에 안 깨지는 압박 학습 |
| 18 | Teach | Collect | 6색 첫 전환 | 색상 증가가 탐색 난이도를 올림 체감 |
| 19 | Spike | Collect | 6색 + stone | 첫 명확한 난이도 벽 |
| 20 | Milestone | Collect | Pod 02 총정리 | 첫 진짜 "레벨다운 퍼즐" 감각 |

### Pod 03: 레벨 21~30

목적:

- 2-layer ice
- mixed 초입
- 장애물 간 우선순위 판단 시작

| Lv | Role | Goal Shape | Main Focus | Intent |
|----|------|------------|------------|--------|
| 21 | Teach | Collect | 2-layer ice 첫 소개 | 한 칸을 여러 번 열어야 하는 구조 이해 |
| 22 | Apply | Collect | 2-layer ice 소수 | 특정 칸 집중 공략 학습 |
| 23 | Apply | Collect | 2-layer ice 확장 | 일반 매치만으로는 비효율적 체감 |
| 24 | Test | Collect | 높은 collect 압박 맛보기 | 효율 좋은 수 찾기 시작 |
| 25 | Relief | Collect | 시원한 연쇄 유도 | 압박 완화, 보상형 레벨 |
| 26 | Teach | Collect | 첫 ice + chain 혼합 | 우선 어디를 열어야 하는지 학습 |
| 27 | Apply | Collect | mixed route opening | 공간 확보 먼저 vs 목표 먼저 판단 |
| 28 | Apply | Collect | mixed 응용 | 한쪽을 열어 다른 쪽을 푸는 구조 |
| 29 | Spike | Collect | mixed + 높은 압박 | 첫 mixed 스파이크 |
| 30 | Milestone | Collect | Pod 03 총정리 | mixed 입문 마감 |

### Pod 04: 레벨 31~40

목적:

- stone 2-layer 감각
- mixed 심화
- 첫 멀티 목표 진입

| Lv | Role | Goal Shape | Main Focus | Intent |
|----|------|------------|------------|--------|
| 31 | Teach | Collect | stone 2-layer 기초 | 진짜 공간 개방 퍼즐 시작 |
| 32 | Apply | Collect | chain + stone | 이동 자유와 공간 개방의 충돌 |
| 33 | Apply | Collect | mixed 구조 심화 | 루트 읽기 강화 |
| 34 | Test | Collect | 높은 압박 mixed | 좋은 수와 나쁜 수 차이 체감 |
| 35 | Relief | Collect | special payoff 중심 | 쉬는 레벨이지만 학습은 유지 |
| 36 | Teach | Collect + Ice | 첫 멀티 목표 | HUD를 보고 우선순위를 잡는 법 학습 |
| 37 | Apply | Collect + Ice | collect + clear 운영 | 한 턴 두 가치 만들기 |
| 38 | Apply | Collect + Ice | 멀티골 압박 증가 | 진행도 분산 관리 |
| 39 | Spike | Collect + Ice | 멀티골 + mixed 압박 | World 1 후반 첫 운영형 스파이크 |
| 40 | Milestone | Collect + Ice | Pod 04 총정리 | 첫 멀티골 마감, 회복감 포함 |

### Pod 05: 레벨 41~50

목적:

- mixed blocker 확장
- timed gem 첫 경험
- World 1 마감

| Lv | Role | Goal Shape | Main Focus | Intent |
|----|------|------------|------------|--------|
| 41 | Teach | Collect + Ice | mixed dense board | 복합 보드 읽기 시작 |
| 42 | Apply | Collect + Ice | mixed route planning | 먼저 풀어야 할 층 찾기 |
| 43 | Teach | Collect + Ice | 첫 timed gem | 긴급 목표 개념 학습 |
| 44 | Apply | Collect + Ice | timed gem 2개 | 위험 우선순위 판단 |
| 45 | Relief | Collect + Ice | timer 포함 완화 레벨 | 긴장 후 안정 구간 |
| 46 | Teach | Collect + Stone | stone goal 첫 소개 | goal로서 stone 처리 이해 |
| 47 | Apply | Collect + Stone | stone + timer | 늦게 터뜨리면 손해 감각 |
| 48 | Apply | Collect + Stone | mixed + stone 운영 | 구조적 루트 우선순위 |
| 49 | Spike | Collect + Stone | World 1 최종 압박 | 첫 진짜 후반부 맛보기 |
| 50 | Milestone | Collect + Stone | World 1 피날레 | 어렵지만 시원하게 끝나는 레벨 |

---

## Band 2: 레벨 51~100

### Pod 06: 레벨 51~60

목적:

- World 1 복습
- 외곽 압박 레이아웃

| Lv | Role | Goal Shape | Main Focus | Intent |
|----|------|------------|------------|--------|
| 51 | Refresh | Collect | World 2 시작, 난이도 리셋 | 새 월드 진입 부담 완화 |
| 52 | Apply | Collect | 외곽 목표 수집 | 가장자리 접근 감각 |
| 53 | Apply | Collect + Ice | 외곽 ice 처리 | 바깥부터 안으로 여는 흐름 |
| 54 | Test | Collect + Ice | 외곽 압박 + 짧은 moves | 위치 읽기 시험 |
| 55 | Relief | Collect | cascade 보상형 | 다시 자신감 회복 |
| 56 | Apply | Collect + Chain | 외곽 chain | 이동 자유 확보가 핵심 |
| 57 | Apply | Collect + Mixed | 외곽 mixed | 어느 방향부터 풀지 선택 |
| 58 | Test | Collect + Mixed | 외곽 압박 심화 | 작은 실수 비용 상승 |
| 59 | Spike | Collect + Mixed | Pod 06 최고 압박 | 외곽 퍼즐 mastery 체크 |
| 60 | Milestone | Collect + Mixed | 외곽 월드 소결산 | 월드 리듬 고정 |

### Pod 07: 레벨 61~70

목적:

- 중앙 압박 레이아웃
- board center control

| Lv | Role | Goal Shape | Main Focus | Intent |
|----|------|------------|------------|--------|
| 61 | Teach | Collect | 중앙 열기 | 중앙 제어 중요성 학습 |
| 62 | Apply | Collect + Ice | 중앙 ice | 중앙이 열리면 연쇄가 산다는 감각 |
| 63 | Apply | Collect + Chain | 중앙 chain | 중앙 움직임 확보 |
| 64 | Test | Collect + Mixed | 중앙 route planning | 어디를 먼저 뚫을지 사고 유도 |
| 65 | Relief | Collect | 중심부 cascade | special 잘 터지는 보상형 |
| 66 | Apply | Collect + Stone | 중앙 stone | 공간 개방과 목표 병행 |
| 67 | Apply | Collect + Ice | 중앙 집중 수집 | 한 영역 몰입형 퍼즐 |
| 68 | Test | Collect + Mixed | 중앙 lock 해제형 | setup turn 학습 초입 |
| 69 | Spike | Collect + Mixed | 중앙 압박 최대치 | 짧고 강한 시험 |
| 70 | Milestone | Collect + Mixed | Pod 07 총정리 | 중앙 보드 마감 |

### Pod 08: 레벨 71~80

목적:

- 분리 보드
- 좁은 길
- 연결 지점 읽기

| Lv | Role | Goal Shape | Main Focus | Intent |
|----|------|------------|------------|--------|
| 71 | Teach | Collect | 좌우 분리 보드 | 연결 지점 중요성 학습 |
| 72 | Apply | Collect + Ice | 분리 + ice | 연결 전 준비 단계 필요 |
| 73 | Apply | Collect + Chain | 좁은 길 + chain | 길 확보의 가치 체감 |
| 74 | Test | Collect + Mixed | 분리 구역 운영 | 한쪽만 보면 망하는 퍼즐 |
| 75 | Relief | Collect | 분리 보드 완화형 | 연결 후 시원한 보상 |
| 76 | Apply | Collect + Stone | 좁은 길 + stone | 한 칸이 전체 흐름을 바꿈 |
| 77 | Apply | Collect + Mixed | split board 심화 | 두 영역 동시 관리 |
| 78 | Test | Collect + Mixed | 좁은 연결부 압박 | 선택 가치 강화 |
| 79 | Spike | Collect + Mixed | Pod 08 최고 퍼즐형 | 공간 읽기 난이도 상승 |
| 80 | Milestone | Collect + Mixed | 분리 보드 피날레 | layout mastery 체크 |

### Pod 09: 레벨 81~90

목적:

- World 2 종합 mixed
- 기존 메커닉 안정화

| Lv | Role | Goal Shape | Main Focus | Intent |
|----|------|------------|------------|--------|
| 81 | Refresh | Collect | mixed 복습 | 과한 압박 없이 재정렬 |
| 82 | Apply | Collect + Ice | mixed + collect 운영 | 안정적 운영형 |
| 83 | Apply | Collect + Stone | mixed + stone | 공간과 목표 동시 판단 |
| 84 | Test | Collect + Mixed | mixed route choice | 여러 답 중 좋은 답 찾기 |
| 85 | Relief | Collect | 쉬는 레벨 | 실패 루프 끊기 |
| 86 | Apply | Collect + Ice | layered pressure | 누적 압박 처리 |
| 87 | Apply | Collect + Stone | stone 가치 극대화 | bomb/wrapped 유도 |
| 88 | Test | Collect + Mixed | mixed hard | 후반 전 진입 준비 |
| 89 | Spike | Collect + Mixed | World 2 최고 압박 | 숙련 체크 |
| 90 | Milestone | Collect + Mixed | World 2 전주곡 | 다음 월드 진입 전 정리 |

### Pod 10: 레벨 91~100

목적:

- World 2 피날레
- World 3로 넘어가기 전 "보드 읽기" 감각 강화

| Lv | Role | Goal Shape | Main Focus | Intent |
|----|------|------------|------------|--------|
| 91 | Refresh | Collect | 피날레 전 완충 | 리듬 재정렬 |
| 92 | Apply | Collect + Ice | 라인 가치 높은 보드 | special 준비 유도 |
| 93 | Apply | Collect + Stone | bomb 가치 높은 보드 | 교차점 노리기 |
| 94 | Test | Collect + Mixed | 레이아웃 읽기 시험 | 단순 수치보다 구조 해석 |
| 95 | Relief | Collect | 축제형 쉬는 레벨 | 100 직전 숨 고르기 |
| 96 | Apply | Collect + Mixed | split + mixed | 복합 운영 |
| 97 | Apply | Collect + Mixed | timed 없는 hard mixed | pure board reading |
| 98 | Test | Collect + Mixed | 짧고 정교한 퍼즐 | 한 수 차이 체감 |
| 99 | Spike | Collect + Mixed | World 2 최종 스파이크 | 100 전 마지막 시험 |
| 100 | Milestone | Collect + Mixed | World 2 피날레 | 크게 보상되는 마감 레벨 |

---

## 이 표를 실제로 쓰는 방법

실제 구현 순서 권장:

1. 레벨 역할부터 고정한다
2. 메인 메커닉을 정한다
3. 목표 타입을 정한다
4. 그 다음에 moves / collect 수치를 맞춘다
5. 마지막에 스타 기준을 조정한다

즉, 아래 순서가 아니다.

- 먼저 moves를 정하고
- 그 다음 목표를 맞추는 방식

이 방식은 포드 리듬이 무너지기 쉽다.

권장 방식은 아래다.

- "이 레벨은 Teach인가 Relief인가 Spike인가?"
- "무엇을 배우게 할 것인가?"
- "실패했을 때 무엇을 다시 생각하게 만들 것인가?"

이걸 먼저 정하고 숫자를 얹는다.

---

## 우선 제작 추천 구간

지금 직접 수정한다면 아래 순서를 추천한다.

### 1차

- 1~20
  - 초반 체감 고정
  - 5색/6색 전환 안정화

### 2차

- 36~50
  - 멀티 목표
  - timed gem
  - World 1 마감 안정화

### 3차

- 51~100
  - 레이아웃 차별화
  - World 2 구조 고정

---

## 결론

이 문서의 핵심은 "1~100을 전부 수치로 미리 못 박는 것"이 아니다.

핵심은 아래 3가지다.

- 레벨의 역할을 먼저 고정한다
- 포드 리듬을 유지한다
- World 1과 World 2가 서로 다른 학습 감각을 갖게 만든다

이 초안표를 기준으로 작업하면, 나중에 수치가 바뀌어도 레벨 구조는 유지할 수 있다.
