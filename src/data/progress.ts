// ─── 플레이어 진행도 (localStorage) ─────────────────

const STORAGE_KEY = 'sweet_crunch_progress';

// ─── 하트(라이프) 시스템 상수 ────────────────────────
export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 20 * 60 * 1000; // 20분에 1개 회복

export interface BoosterInventory {
  shuffle: number;
  hint: number;
  lightning: number;
}

export type BoosterType = keyof BoosterInventory;

const DEFAULT_BOOSTERS: BoosterInventory = {
  shuffle: 3,
  hint: 2,
  lightning: 1,
};

export interface PlayerProgress {
  version: number;                          // 스키마 버전
  highestUnlocked: number;                  // 해금된 최고 레벨 (1부터)
  stars: Record<number, number>;            // level → 0|1|2|3
  highScores: Record<number, number>;       // level → 최고 점수
  hearts: number;                           // 현재 하트 수
  lastHeartTime: number;                    // 마지막 하트 소모/회복 시각 (ms timestamp)
  coins: number;                            // 코인 (게임 내 화폐)
  boosters: BoosterInventory;               // 부스터 인벤토리
  lastFreeSecondChanceDate?: string;        // "YYYY-MM-DD" — 1일 1회 무료 세컨드 찬스
  lastDailyRewardDate?: string;             // "YYYY-MM-DD" — 일일 보상 수령일
  dailyAdBoostersDate?: string;             // "YYYY-MM-DD" — 광고 부스터 사용 날짜
  dailyAdBoostersUsed?: number;             // 오늘 광고로 받은 부스터 수
}

const CURRENT_VERSION = 3;

function clampBoosterInventory(boosters?: Partial<BoosterInventory>): BoosterInventory {
  return {
    shuffle: Math.max(0, Math.floor(boosters?.shuffle ?? DEFAULT_BOOSTERS.shuffle)),
    hint: Math.max(0, Math.floor(boosters?.hint ?? DEFAULT_BOOSTERS.hint)),
    lightning: Math.max(0, Math.floor(boosters?.lightning ?? DEFAULT_BOOSTERS.lightning)),
  };
}

function defaultProgress(): PlayerProgress {
  return {
    version: CURRENT_VERSION,
    highestUnlocked: 1,
    stars: {},
    highScores: {},
    hearts: MAX_HEARTS,
    lastHeartTime: Date.now(),
    coins: 0,
    boosters: { ...DEFAULT_BOOSTERS },
  };
}

/** 이전 버전 데이터 마이그레이션 */
function migrate(data: Record<string, unknown>): PlayerProgress {
  const base = defaultProgress();

  // v1 → v2: hearts, lastHeartTime, coins 추가
  base.highestUnlocked = (data.highestUnlocked as number) ?? 1;
  base.stars = (data.stars as Record<number, number>) ?? {};
  base.highScores = (data.highScores as Record<number, number>) ?? {};
  base.hearts = (data.hearts as number) ?? MAX_HEARTS;
  base.lastHeartTime = (data.lastHeartTime as number) ?? Date.now();
  base.coins = (data.coins as number) ?? 0;
  base.boosters = clampBoosterInventory(data.boosters as Partial<BoosterInventory> | undefined);
  base.version = CURRENT_VERSION;

  return base;
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // 버전 체크 + 마이그레이션
    if (!parsed.version || (parsed.version as number) < CURRENT_VERSION) {
      const migrated = migrate(parsed);
      saveProgress(migrated);
      return migrated;
    }

    return {
      version: CURRENT_VERSION,
      highestUnlocked: (parsed.highestUnlocked as number) ?? 1,
      stars: (parsed.stars as Record<number, number>) ?? {},
      highScores: (parsed.highScores as Record<number, number>) ?? {},
      hearts: (parsed.hearts as number) ?? MAX_HEARTS,
      lastHeartTime: (parsed.lastHeartTime as number) ?? Date.now(),
      coins: (parsed.coins as number) ?? 0,
      boosters: clampBoosterInventory(parsed.boosters as Partial<BoosterInventory> | undefined),
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // localStorage 접근 불가 시 무시
  }
}

// ─── 하트 관련 유틸리티 ──────────────────────────────

/** 시간 경과에 따른 하트 자동 회복 적용 */
export function regenerateHearts(progress: PlayerProgress): PlayerProgress {
  if (progress.hearts >= MAX_HEARTS) {
    progress.lastHeartTime = Date.now();
    return progress;
  }

  const now = Date.now();
  const elapsed = now - progress.lastHeartTime;
  const recovered = Math.floor(elapsed / HEART_REGEN_MS);

  if (recovered > 0) {
    progress.hearts = Math.min(MAX_HEARTS, progress.hearts + recovered);
    progress.lastHeartTime = progress.lastHeartTime + recovered * HEART_REGEN_MS;
    if (progress.hearts >= MAX_HEARTS) {
      progress.lastHeartTime = now;
    }
    saveProgress(progress);
  }

  return progress;
}

/** 다음 하트 회복까지 남은 시간 (ms). 풀 하트면 0 반환 */
export function getNextHeartTimeMs(progress: PlayerProgress): number {
  if (progress.hearts >= MAX_HEARTS) return 0;
  const elapsed = Date.now() - progress.lastHeartTime;
  return Math.max(0, HEART_REGEN_MS - elapsed);
}

/** 하트 1개 소모 (false면 하트 부족) */
export function consumeHeart(): boolean {
  const progress = regenerateHearts(loadProgress());
  if (progress.hearts <= 0) return false;
  progress.hearts--;
  progress.lastHeartTime = Date.now();
  saveProgress(progress);
  return true;
}

/** 하트 1개 추가 (광고 보상 등) */
export function addHeart(count = 1): void {
  const progress = loadProgress();
  progress.hearts = Math.min(MAX_HEARTS, progress.hearts + count);
  saveProgress(progress);
}

/** 코인 추가 */
export function addCoins(amount: number): void {
  const progress = loadProgress();
  progress.coins += amount;
  saveProgress(progress);
}

export function getBoosterInventory(): BoosterInventory {
  return { ...loadProgress().boosters };
}

export function consumeBooster(type: BoosterType): boolean {
  const progress = loadProgress();
  if (progress.boosters[type] <= 0) return false;
  progress.boosters[type]--;
  saveProgress(progress);
  return true;
}

export function addBooster(type: BoosterType, amount = 1): BoosterInventory {
  const progress = loadProgress();
  progress.boosters[type] = Math.max(0, progress.boosters[type] + Math.max(0, Math.floor(amount)));
  saveProgress(progress);
  return { ...progress.boosters };
}

/** 일일 보상 수령 (1일 1회, +50 코인) */
export function claimDailyReward(): { claimed: boolean; reward: string } {
  const progress = loadProgress();
  const today = new Date().toISOString().slice(0, 10);
  if (progress.lastDailyRewardDate === today) {
    return { claimed: false, reward: '' };
  }
  progress.lastDailyRewardDate = today;
  progress.coins += 50;
  saveProgress(progress);
  return { claimed: true, reward: '+50 Coins' };
}

/** 무료 세컨드 찬스 사용 가능 여부 (1일 1회) */
export function canUseFreeSecondChance(): boolean {
  const progress = loadProgress();
  const today = new Date().toISOString().slice(0, 10);
  return progress.lastFreeSecondChanceDate !== today;
}

/** 무료 세컨드 찬스 사용 기록 */
export function markFreeSecondChanceUsed(): void {
  const progress = loadProgress();
  progress.lastFreeSecondChanceDate = new Date().toISOString().slice(0, 10);
  saveProgress(progress);
}

/** 광고 부스터 사용 가능 여부 (일일 5회 한도) */
export function canUseAdBooster(): boolean {
  const progress = loadProgress();
  const today = new Date().toISOString().slice(0, 10);
  if (progress.dailyAdBoostersDate !== today) return true;
  return (progress.dailyAdBoostersUsed ?? 0) < 5;
}

/** 광고 부스터 사용 기록 + 부스터 1개 지급 */
export function grantAdBooster(type: BoosterType): void {
  const progress = loadProgress();
  const today = new Date().toISOString().slice(0, 10);
  if (progress.dailyAdBoostersDate !== today) {
    progress.dailyAdBoostersDate = today;
    progress.dailyAdBoostersUsed = 0;
  }
  progress.dailyAdBoostersUsed = (progress.dailyAdBoostersUsed ?? 0) + 1;
  progress.boosters[type] = Math.max(0, progress.boosters[type]) + 1;
  saveProgress(progress);
}

/** 오늘 남은 광고 부스터 횟수 */
export function remainingAdBoosters(): number {
  const progress = loadProgress();
  const today = new Date().toISOString().slice(0, 10);
  if (progress.dailyAdBoostersDate !== today) return 5;
  return Math.max(0, 5 - (progress.dailyAdBoostersUsed ?? 0));
}

/** 레벨 클리어 후 진행도 업데이트 */
export function updateLevelProgress(
  levelNum: number,
  score: number,
  starThresholds: [number, number, number],
): { stars: number; isNewBest: boolean; coinsEarned: number } {
  const progress = loadProgress();

  // 별 계산
  let stars = 0;
  if (score >= starThresholds[0]) stars = 1;
  if (score >= starThresholds[1]) stars = 2;
  if (score >= starThresholds[2]) stars = 3;

  // 최고 기록 갱신
  const prevStars = progress.stars[levelNum] ?? 0;
  const prevScore = progress.highScores[levelNum] ?? 0;
  const isNewBest = score > prevScore;

  progress.stars[levelNum] = Math.max(prevStars, stars);
  progress.highScores[levelNum] = Math.max(prevScore, score);

  // 다음 레벨 해금
  if (levelNum >= progress.highestUnlocked) {
    progress.highestUnlocked = levelNum + 1;
  }

  // 코인 보상: 별 수 × 50
  const coinsEarned = stars * 50;
  progress.coins += coinsEarned;

  saveProgress(progress);
  return { stars, isNewBest, coinsEarned };
}

/**
 * Sugar Rush 완료 후 별/하이스코어만 추가 갱신 (코인 재지급 없음).
 * updateLevelProgress()로 이미 한 번 저장된 뒤 Sugar Rush 보너스 점수가 추가된
 * 경우에만 호출한다. 코인 중복 지급을 방지하면서 최종 점수로 별/스코어를 업데이트한다.
 */
export function updateLevelProgressNoCoin(
  levelNum: number,
  score: number,
  starThresholds: [number, number, number],
): { stars: number; isNewBest: boolean } {
  const progress = loadProgress();

  // 별 계산
  let stars = 0;
  if (score >= starThresholds[0]) stars = 1;
  if (score >= starThresholds[1]) stars = 2;
  if (score >= starThresholds[2]) stars = 3;

  const prevStars = progress.stars[levelNum] ?? 0;
  const prevScore = progress.highScores[levelNum] ?? 0;
  const isNewBest = score > prevScore;

  // 별/하이스코어만 갱신 (코인·해금은 이미 updateLevelProgress에서 처리됨)
  progress.stars[levelNum] = Math.max(prevStars, stars);
  progress.highScores[levelNum] = Math.max(prevScore, score);

  saveProgress(progress);
  return { stars, isNewBest };
}
