export interface RandomSnapshot {
  seed: number;
  state: number;
  calls: number;
}

/**
 * 빠르고 재현 가능한 Mulberry32 기반 난수 생성기입니다.
 * 보안 목적이 아니라 게임 상태 재현과 QA Trace를 위해 사용합니다.
 */
export class SeededRandom {
  readonly seed: number;
  private state: number;
  private callCount = 0;

  constructor(seed: number) {
    if (!Number.isFinite(seed)) throw new Error('Seed는 유한한 숫자여야 합니다.');
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  static fromSnapshot(snapshot: RandomSnapshot): SeededRandom {
    const random = new SeededRandom(snapshot.seed);
    random.state = snapshot.state >>> 0;
    random.callCount = Math.max(0, Math.floor(snapshot.calls));
    return random;
  }

  get calls(): number {
    return this.callCount;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    this.callCount++;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  int(minInclusive: number, maxInclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
      throw new Error('난수 범위는 정수여야 합니다.');
    }
    if (maxInclusive < minInclusive) {
      throw new Error('난수 최댓값은 최솟값보다 작을 수 없습니다.');
    }
    const width = maxInclusive - minInclusive + 1;
    return minInclusive + Math.floor(this.next() * width);
  }

  boolean(): boolean {
    return this.next() >= 0.5;
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new Error('빈 배열에서는 값을 선택할 수 없습니다.');
    return values[this.int(0, values.length - 1)];
  }

  shuffleInPlace<T>(values: T[]): T[] {
    for (let index = values.length - 1; index > 0; index--) {
      const other = this.int(0, index);
      [values[index], values[other]] = [values[other], values[index]];
    }
    return values;
  }

  snapshot(): RandomSnapshot {
    return {
      seed: this.seed,
      state: this.state,
      calls: this.callCount,
    };
  }
}

/** 일반 플레이에서 사용할 초기 Seed를 만듭니다. QA 실행은 명시적인 Seed를 전달합니다. */
export function createRuntimeSeed(): number {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const value = new Uint32Array(1);
    cryptoApi.getRandomValues(value);
    return value[0];
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

