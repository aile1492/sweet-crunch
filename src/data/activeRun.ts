// ─── 진행 중 런(Run) 스냅샷 저장/복구 ────────────────────────────────────────
// 앱이 예기치 않게 종료됐을 때 직전 안정 상태(캐스케이드 완료 시점)를 복구한다.
//
// 저장 시점 : onCascadeSettled() — 보드가 완전히 정지된 직후
// 삭제 시점 : 레벨 클리어 / 게임오버 / 일시정지 화면 "Back to Map" (수동 종료)
// 복구 진입 : LevelSelectScene이 snapshots을 감지 → 사용자에게 이어하기 물음
// 악용 방지 : 슬롯 1개, 가장 최근 안정 상태만 덮어씀 (세이브 어뷰징 불가)

import type { TileType, SpecialType, CellModifier } from '../config';

export interface RunSnapshot {
  readonly version: 1;
  /**
   * 스냅샷 상태
   * - `'playing'`    : 정상 플레이 중 → 이어하기 가능
   * - `'fail_popup'` : 실패 팝업 표시 중 → 이어하기 불가 (패배 직전 롤백 방지)
   *
   * 세컨드 찬스를 사용하면 다음 캐스케이드 완료 시 `'playing'`으로 덮어씀.
   * 구버전 스냅샷(phase 없음)은 `'playing'`으로 간주.
   */
  phase: 'playing' | 'fail_popup';
  /** 진행 중인 레벨 번호 */
  level: number;
  /** 8×8 타일 종류 */
  grid: (TileType | null)[][];
  /** 8×8 특수 젬 종류 */
  specialGrid: (SpecialType | null)[][];
  /** lineBlast 방향 (non-lineBlast 셀은 null) */
  lineDirections: ('horizontal' | 'vertical' | null)[][];
  /** 얼음·체인·돌 장애물 */
  cellModifiers: (CellModifier | null)[][];
  /** 타이머 젬 카운트다운 값 */
  timedGemCounters: (number | null)[][];
  /** 남은 이동 횟수 */
  movesLeft: number;
  /** 현재 점수 */
  score: number;
  /** collect 골 수집량 */
  goalCollected: number;
  /** 얼음 제거 수 */
  iceCleared: number;
  /** 돌 제거 수 */
  stoneCleared: number;
  /** 2차 기회 사용 여부 */
  secondChanceUsed: boolean;
  /** 저장 시각 (Unix ms) */
  savedAt: number;
}

const STORAGE_KEY = 'sweet_crunch_active_run';

/** 현재 런 스냅샷을 localStorage에 저장 */
export function saveRun(snapshot: RunSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage 사용 불가 환경(개인정보 모드 등) — 무시
  }
}

/** 저장된 런 스냅샷을 반환, 없으면 null */
export function loadRun(): RunSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as RunSnapshot;
    // 버전 불일치 시 폐기
    if (snap.version !== 1) {
      clearRun();
      return null;
    }
    return snap;
  } catch {
    return null;
  }
}

/** 저장된 런 스냅샷 삭제 */
export function clearRun(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}
