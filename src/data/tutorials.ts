export interface TutorialStep {
  message: string;
  subMessage?: string;
  position: 'top' | 'bottom';
  focusCells?: { row: number; col: number }[];
  swipeHint?: { fromRow: number; fromCol: number; toRow: number; toCol: number };
  autoAdvanceMs?: number;
  trigger: 'onStart' | 'afterFirstMatch' | 'afterSpecialCreate' | 'onMovesMade';
  movesCount?: number;
}

export interface LevelTutorial {
  level: number;
  steps: TutorialStep[];
}

export const TUTORIALS: LevelTutorial[] = [
  // ── Pod 01: 기초 & 첫 얼음 (1~10) ─────────────────────────────────────
  {
    level: 1,
    steps: [
      {
        message: '같은 디저트 3개를 맞춰보세요',
        subMessage: 'Swipe adjacent sweets to make a match-3.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 2800,
      },
      {
        message: '첫 매치를 만들면 주문이 채워져요',
        subMessage: 'Every match helps fill the bakery order.',
        position: 'bottom',
        trigger: 'afterFirstMatch',
        autoAdvanceMs: 2200,
      },
    ],
  },
  {
    level: 2,
    steps: [
      {
        message: '연쇄 매치가 나올수록 점수가 크게 올라가요',
        subMessage: 'Cascades are the fastest way to earn stars.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3000,
      },
      {
        message: '움직임을 아끼고 긴 콤보를 노려보세요',
        subMessage: 'Save moves for bigger turns.',
        position: 'bottom',
        trigger: 'onMovesMade',
        movesCount: 2,
        autoAdvanceMs: 2500,
      },
    ],
  },
  {
    level: 3,
    steps: [
      {
        message: '4개 이상을 맞추면 특수 젬이 생겨요',
        subMessage: 'Special gems appear from bigger patterns.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3200,
      },
      {
        message: '직선 4개는 라인, 5개는 컬러밤이에요',
        subMessage: 'Line Blast clears a row or column. Color Bomb clears a color.',
        position: 'bottom',
        trigger: 'onStart',
        autoAdvanceMs: 3800,
      },
      {
        message: '방금 만든 특수 젬은 아껴두면 더 강해져요',
        subMessage: 'Try combining specials instead of firing them immediately.',
        position: 'top',
        trigger: 'afterSpecialCreate',
        autoAdvanceMs: 2600,
      },
    ],
  },
  {
    level: 4,
    steps: [
      {
        message: '라인 젬은 보드를 길게 정리할 때 좋아요',
        subMessage: 'Use it where the board feels blocked.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 2800,
      },
    ],
  },
  {
    level: 5,
    steps: [
      {
        message: '2x2 정사각형은 Wrapped 젬으로 바뀌어요',
        subMessage: 'Wrapped gems burst twice and clear a chunky area.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3200,
      },
      {
        message: '십자 형태 매치는 Cross Blast를 만들어요',
        subMessage: 'Cross Blast clears both a row and a column together.',
        position: 'bottom',
        trigger: 'onStart',
        autoAdvanceMs: 3400,
      },
    ],
  },
  {
    level: 6,
    steps: [
      {
        message: '❄️ 새 장애물 — 얼음!',
        subMessage: '얼음이 덮인 칸의 타일을 직접 매칭해야 깨져요.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3800,
      },
      {
        message: '얼음 칸도 자유롭게 스왑할 수 있어요',
        subMessage: '이 레벨의 얼음은 1겹 — 한 번만 매칭하면 바로 사라져요.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3400,
      },
    ],
  },

  // ── Pod 02: 체인 & 돌 (11~20) ───────────────────────────────────────────
  {
    level: 11,
    steps: [
      {
        message: '⛓ 새 장애물 — 체인!',
        subMessage: '체인에 잠긴 칸은 바로 움직일 수 없어요.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3000,
      },
      {
        message: '체인 바로 옆에서 매칭하면 체인이 풀려요',
        subMessage: 'Match next to chains to break them open.',
        position: 'bottom',
        trigger: 'onStart',
        autoAdvanceMs: 3000,
      },
    ],
  },
  {
    level: 16,
    steps: [
      {
        message: '🪨 새 장애물 — 돌!',
        subMessage: '돌은 인접한 칸에서 여러 번 매칭해야 부서져요.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3200,
      },
      {
        message: '한 번에 안 깨지는 게 정상이에요',
        subMessage: 'Keep matching nearby. Stone cracks more each time.',
        position: 'bottom',
        trigger: 'onMovesMade',
        movesCount: 3,
        autoAdvanceMs: 2800,
      },
    ],
  },

  // ── Pod 03: 2겹 얼음 & 혼합 (21~30) ─────────────────────────────────────
  {
    level: 21,
    steps: [
      {
        message: '❄️❄️ 이번엔 얼음이 2겹이에요',
        subMessage: '같은 칸을 두 번 매칭해야 완전히 녹아요.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3200,
      },
      {
        message: '특수 젬을 얼음 위에 쓰면 한 번에 뚫려요',
        subMessage: 'Special gems can break both layers at once.',
        position: 'bottom',
        trigger: 'onStart',
        autoAdvanceMs: 3000,
      },
    ],
  },
  {
    level: 26,
    steps: [
      {
        message: '얼음과 체인이 같이 나왔어요',
        subMessage: '어디를 먼저 열어야 할지 결정하는 게 핵심이에요.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3400,
      },
      {
        message: '체인을 먼저 풀어야 이동 공간이 생겨요',
        subMessage: 'Unlock chains first to open up your moves.',
        position: 'bottom',
        trigger: 'onStart',
        autoAdvanceMs: 3000,
      },
    ],
  },

  // ── Pod 04: 멀티 목표 (36~40) ─────────────────────────────────────────
  {
    level: 36,
    steps: [
      {
        message: '이번엔 목표가 두 개예요',
        subMessage: '수집 목표와 얼음 제거를 동시에 진행하세요.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3400,
      },
      {
        message: '상단의 목표 게이지를 확인하며 진행하세요',
        subMessage: 'Watch both progress bars — both must be complete.',
        position: 'bottom',
        trigger: 'onStart',
        autoAdvanceMs: 3200,
      },
    ],
  },

  // ── Pod 05: 타이머 젬 & 하드코어 (41~50) ─────────────────────────────────
  {
    level: 43,
    steps: [
      {
        message: '이 보드는 모든 장애물이 한꺼번에 나와요',
        subMessage: 'Prioritize unblocking the center to create combos.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3200,
      },
    ],
  },
  {
    level: 44,
    steps: [
      {
        message: '⏳ 새 장치 — 타이머 젬!',
        subMessage: '숫자가 0이 되면 폭발해요. 먼저 매칭해서 제거하세요.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3800,
      },
      {
        message: '카운터가 낮은 젬부터 먼저 처리하세요',
        subMessage: 'Prioritize the most urgent timer before making setup moves.',
        position: 'bottom',
        trigger: 'onStart',
        autoAdvanceMs: 3200,
      },
    ],
  },
  {
    level: 46,
    steps: [
      {
        message: '이번 목표는 돌을 없애는 거예요',
        subMessage: 'Stones must be destroyed — match nearby tiles repeatedly.',
        position: 'top',
        trigger: 'onStart',
        autoAdvanceMs: 3200,
      },
      {
        message: '특수 젬 + 특수 젬 조합이 돌에 특히 강해요',
        subMessage: 'Combine specials near stones for maximum impact.',
        position: 'bottom',
        trigger: 'onMovesMade',
        movesCount: 3,
        autoAdvanceMs: 3000,
      },
    ],
  },
];

export function getLevelTutorial(level: number): LevelTutorial | null {
  return TUTORIALS.find(tutorial => tutorial.level === level) ?? null;
}
