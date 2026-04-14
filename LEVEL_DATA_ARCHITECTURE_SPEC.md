# Sweet Crunch 레벨 데이터 구조 스펙

## 문서 목적

이 문서는 `Sweet Crunch`의 레벨 시스템을 `500` 스테이지까지 확장하기 위해 권장하는 데이터 구조를 정리한 문서다.

목표:

- `src/data/levels.ts`의 단일 파일/단일 수식 구조를 분리한다
- 사람이 직접 수정하기 쉬운 구조를 만든다
- 500레벨까지 늘어나도 유지보수 가능하게 한다

이 문서는 구현 코드가 아니라 설계 스펙이다.

---

## 현재 구조의 한계

현재 구조는 아래와 같은 장점이 있다.

- 빠르게 레벨 생성 가능
- 작은 프로젝트에서는 단순함
- 기본 공식 조정이 쉬움

하지만 500레벨 기준으로는 아래 한계가 크다.

- 레벨 개성이 부족해진다
- 구간별 의도를 담기 어렵다
- 특정 레벨만 예외 처리하기 불편하다
- 수동 튜닝 포인트가 한 파일에 몰린다
- 튜토리얼/마일스톤/회복 레벨 관리가 어렵다

---

## 최종 권장 구조

권장 파일 구조:

```text
src/data/
├── levels.ts
├── levelBands.ts
├── levelPods.ts
├── levelTemplates.ts
├── levelOverrides.ts
├── levelFactories.ts
└── tutorials.ts
```

역할:

- `levels.ts`
  - 최종 `LEVELS` 배열 조립
  - `getLevelDef()` 제공
- `levelBands.ts`
  - 50레벨 월드 단위 규칙
- `levelPods.ts`
  - 10레벨 포드 단위 규칙
- `levelTemplates.ts`
  - 보드 레이아웃/목표 템플릿
- `levelOverrides.ts`
  - 특정 레벨 수동 수정값
- `levelFactories.ts`
  - 보드/목표/레벨 생성 헬퍼

---

## 핵심 개념

## 1. Band

Band는 `50레벨` 단위의 큰 설계 구간이다.

예:

- 1~50: FTUE
- 51~100: 숙련
- 101~150: 보드 읽기

Band는 아래를 결정한다.

- 허용 메커닉
- 난이도 철학
- 기본 moves 범위
- 목표 종류 범위
- tutorial / milestone 배치 원칙

---

## 2. Pod

Pod는 `10레벨` 단위의 작은 리듬 단위다.

Pod는 아래를 결정한다.

- 이번 10레벨의 학습 포인트
- relief 레벨 위치
- spike 레벨 위치
- milestone 성격
- 템플릿 후보

---

## 3. Template

Template는 보드 구조와 목표 패턴의 재사용 단위다.

Template는 아래를 담는다.

- 레이아웃 모양
- 장애물 배치 방향
- 목표 구조
- special 유도 방향

중요:

- Template는 완성 레벨이 아니라 뼈대다
- 같은 Template도 수치와 blocker 조합을 바꿔 여러 레벨에 활용 가능하다

---

## 4. Override

Override는 특정 레벨에만 적용하는 수동 수정이다.

사용 대상:

- 튜토리얼 레벨
- 마일스톤 레벨
- 기념 레벨
- 테스트 결과 유독 어렵거나 쉬운 레벨

---

## 권장 타입 정의

아래 타입은 실제 구현 시 참고용 초안이다.

```ts
export interface LevelBandSpec {
  id: string;
  levelStart: number;
  levelEnd: number;
  worldName: string;
  description: string;
  tileCount: 4 | 5 | 6;
  allowedGoals: Array<'collect' | 'clearIce' | 'clearStone'>;
  allowedModifiers: Array<'ice' | 'chain' | 'stone'>;
  allowTimedGems: boolean;
  movesRange: [number, number];
  collectPressureRange: [number, number];
  multiGoalFrequency: 'none' | 'low' | 'medium' | 'high';
  timedGemFrequency: 'none' | 'low' | 'medium' | 'high';
  reliefRule: string;
  milestoneRule: string;
}
```

```ts
export interface LevelPodSpec {
  id: string;
  levelStart: number;
  levelEnd: number;
  bandId: string;
  focus: string;
  dominantMechanics: string[];
  allowedTemplates: string[];
  targetDifficulty: 'teach' | 'easy' | 'normal' | 'hard' | 'milestone';
  reliefLevel: number;
  spikeLevel: number;
  milestoneLevel: number;
  tutorialLevel?: number;
  notes?: string;
}
```

```ts
export interface LevelTemplateSpec {
  id: string;
  layoutType:
    | 'open_center'
    | 'open_edges'
    | 'narrow_vertical'
    | 'narrow_horizontal'
    | 'split_left_right'
    | 'split_top_bottom'
    | 'corner_pressure'
    | 'ring_layout'
    | 'cross_layout'
    | 'stair_layout'
    | 'core_lock_layout'
    | 'outer_shell_layout';
  description: string;
  boardFactoryId: string;
  preferredGoals: Array<'collect' | 'clearIce' | 'clearStone'>;
  preferredModifiers: Array<'ice' | 'chain' | 'stone'>;
  specialBias?: Array<'lineBlast' | 'bomb' | 'wrapped' | 'crossBlast' | 'colorBomb'>;
}
```

```ts
export interface LevelOverrideSpec {
  level: number;
  moves?: number;
  tileCount?: 4 | 5 | 6;
  goals?: LevelGoal[];
  board?: (CellDef | null)[][];
  timedGems?: { row: number; col: number; turns: number }[];
  starThresholds?: [number, number, number];
  tutorialTag?: string;
  notes?: string;
}
```

---

## 레벨 생성 조립 흐름

최종 조립 순서 권장:

1. 레벨 번호로 band 찾기
2. 레벨 번호로 pod 찾기
3. pod에서 template 후보 선택
4. band 규칙으로 기본 moves / 목표 / 빈도 결정
5. template로 board 뼈대 생성
6. pod 포커스로 difficulty tuning
7. override가 있으면 마지막에 덮어쓰기
8. starThresholds 계산
9. 최종 `LevelDef` 반환

---

## 권장 구현 구조 예시

## `levelBands.ts`

역할:

- 각 월드의 거시적 규칙 정의

예시:

```ts
export const LEVEL_BANDS: LevelBandSpec[] = [
  {
    id: 'world_01',
    levelStart: 1,
    levelEnd: 50,
    worldName: 'Bakery Basics',
    description: 'FTUE and first blockers',
    tileCount: 6,
    allowedGoals: ['collect', 'clearIce', 'clearStone'],
    allowedModifiers: ['ice', 'chain', 'stone'],
    allowTimedGems: true,
    movesRange: [18, 27],
    collectPressureRange: [0.65, 1.8],
    multiGoalFrequency: 'medium',
    timedGemFrequency: 'low',
    reliefRule: 'Every pod level 5 should decompress',
    milestoneRule: 'Every pod level 10 should feel rewarding',
  },
];
```

주의:

- `tileCount`는 band 기본값이고, 실제 레벨은 override 가능하게 둔다

---

## `levelPods.ts`

역할:

- 10레벨 단위 설계 리듬 정의

예시:

```ts
export const LEVEL_PODS: LevelPodSpec[] = [
  {
    id: 'pod_01',
    bandId: 'world_01',
    levelStart: 1,
    levelEnd: 10,
    focus: 'match3 basics and first ice',
    dominantMechanics: ['collect', 'ice'],
    allowedTemplates: ['open_center', 'corner_pressure'],
    targetDifficulty: 'teach',
    reliefLevel: 5,
    spikeLevel: 9,
    milestoneLevel: 10,
    tutorialLevel: 1,
  },
];
```

---

## `levelTemplates.ts`

역할:

- 실제 보드 템플릿 사전

예시:

```ts
export const LEVEL_TEMPLATES: LevelTemplateSpec[] = [
  {
    id: 'open_center_collect',
    layoutType: 'open_center',
    description: 'Open board with easy cascade potential',
    boardFactoryId: 'empty_board',
    preferredGoals: ['collect'],
    preferredModifiers: [],
    specialBias: ['lineBlast'],
  },
  {
    id: 'corner_stone_pressure',
    layoutType: 'corner_pressure',
    description: 'Corners locked by stones, center remains active',
    boardFactoryId: 'corner_stones',
    preferredGoals: ['collect', 'clearStone'],
    preferredModifiers: ['stone'],
    specialBias: ['bomb', 'wrapped'],
  },
];
```

---

## `levelFactories.ts`

역할:

- 보드 생성용 헬퍼
- 현재 `iceBoard`, `stoneBoard`, `chainBoard`, `mixedBoard`를 더 확장하는 파일

권장 함수:

```ts
emptyBoard()
iceBoard()
stoneBoard()
chainBoard()
mixedBoard()
ringIceBoard()
cornerStoneBoard()
splitBoard()
coreLockBoard()
stairBoard()
```

중요:

- 이 파일은 "보드 모양"만 담당
- moves, goals, stars는 여기서 정하지 않는다

---

## `levelOverrides.ts`

역할:

- 예외 레벨 전용 수동 값

예시:

```ts
export const LEVEL_OVERRIDES: Record<number, LevelOverrideSpec> = {
  1: {
    moves: 18,
    tileCount: 4,
    goals: [{ type: 'collect', tileType: 'cupcake', count: 12 }],
    tutorialTag: 'ftue_match3',
    notes: 'first playable level',
  },
  50: {
    notes: 'world 1 finale; make rewarding, not oppressive',
  },
  100: {
    notes: 'world 2 finale milestone',
  },
};
```

---

## `levels.ts`

역할:

- 최종 조립만 수행

권장 형태:

```ts
export const LEVELS: LevelDef[] = Array.from({ length: 500 }, (_, i) => {
  const level = i + 1;
  return buildLevel(level);
});

export function getLevelDef(levelNum: number): LevelDef {
  return LEVELS.find(l => l.level === levelNum) ?? LEVELS[0];
}
```

핵심:

- 레벨 생성 규칙은 여기서 직접 길게 쓰지 않는다
- `buildLevel(level)` 내부에서도 단계별 helper 호출만 하게 만든다

---

## 권장 빌더 구조

```ts
function buildLevel(level: number): LevelDef {
  const band = getBandForLevel(level);
  const pod = getPodForLevel(level);
  const template = pickTemplate(level, band, pod);

  let def = createBaseLevel(level, band, pod);
  def = applyTemplate(def, template, level, band, pod);
  def = tuneDifficulty(def, level, band, pod);
  def = applyOverrides(def, level);
  def = finalizeStars(def, level, band, pod);

  return def;
}
```

장점:

- 코드 읽기가 쉬움
- 특정 단계 디버깅이 쉬움
- 500레벨에서도 유지보수 가능

---

## 추천 조정 규칙

## moves

moves는 아래 영향으로 조정한다.

- level role
  - teach / relief면 높임
  - spike면 낮춤
- blocker density
  - stone, 2-layer ice가 많으면 소폭 높임
- timed gem presence
  - timer가 있으면 다른 압박을 줄이거나 moves를 보정

권장 규칙:

- 같은 포드 안에서 `5 -> 9`로 갈수록 조금씩 압박 증가
- `10`은 `9`보다 약간 완화 가능

## goals

goal은 단순히 레벨 번호 기반 증가만 하지 않는다.

권장 규칙:

- collect only 레벨은 pressure 기준 계산
- clear goal이 추가되면 collect를 줄인다
- mixed blocker가 강할수록 collect를 낮춘다

## stars

초기에는 아래처럼 두 단계로 구성하면 좋다.

1. band별 기본 star curve
2. override로 milestone / outlier 조정

나중에는 실플레이 데이터로 교체

---

## 추천 파생 값

실제 계산 시 아래 파생 값을 두면 편하다.

```ts
interface DerivedDifficulty {
  blockerDensity: number;
  blockerWeight: number;
  goalPressure: number;
  timerPressure: number;
  totalPressure: number;
}
```

이 값은 디버그 출력에도 쓰기 좋다.

예시:

- `goalPressure = collectCount / moves`
- `blockerWeight = iceLayers + stoneLayers * 1.5 + chainCells * 0.5`
- `timerPressure = timedGemCount > 0 ? some bonus pressure : 0`

이런 값은 사람이 레벨을 볼 때도 비교 기준이 된다.

---

## 수동 제작과 자동 생성의 경계

500레벨이라고 해서 전부 자동 생성할 필요는 없다.

권장 방식:

- 기본 레벨 80%: band + pod + template 기반 조립
- 중요 레벨 20%: 수동 override

중요 레벨 예시:

- 1
- 5
- 10
- 16
- 25
- 36
- 43
- 50
- 각 월드의 1 / 5 / 10
- 100, 150, 200, 250, 300, 350, 400, 450, 500

---

## 권장 제작 순서

### 단계 1

- 현재 `1~50`을 새 구조로 옮긴다

목표:

- 리팩터링만 하고 체감은 크게 안 바꾸기

### 단계 2

- `51~100` 추가

목표:

- 새 구조가 실제로 확장 가능한지 확인

### 단계 3

- 월드 단위로 50개씩 확장

목표:

- 한 번에 500개를 만들지 말고 검증 가능한 덩어리로 제작

---

## 추천 검증 체크리스트

새 레벨을 만들 때마다 아래를 확인하면 좋다.

- teach / relief / spike / milestone 역할이 분명한가
- 새 메커닉이 갑자기 과도하게 들어가진 않았는가
- collect와 clear 목표가 서로 충돌하지 않는가
- timer가 들어간 레벨에서 다른 압박도 과도하지 않은가
- valid move가 충분한가
- special play가 보상되는가
- 실패했을 때 "억까"보다 "내가 놓친 것"으로 느껴지는가

---

## 결론

500레벨 확장에서는 "레벨 개수"보다 "데이터 구조"가 먼저다.

이 스펙의 핵심은 아래다.

- 월드 단위 band
- 10레벨 단위 pod
- 재사용 가능한 template
- 특정 레벨용 override
- 최종 조립용 builder

이 구조로 가면 나중에 직접 레벨을 만들 때도 이유 있는 수정이 가능하고, 특정 구간만 다시 손보기도 쉬워진다.
