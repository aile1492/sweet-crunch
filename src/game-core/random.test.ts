import { describe, expect, it } from 'vitest';
import { SeededRandom } from './random';

describe('SeededRandom', () => {
  it('같은 Seed에서 같은 수열을 만든다', () => {
    const first = new SeededRandom(1492);
    const second = new SeededRandom(1492);

    expect(Array.from({ length: 20 }, () => first.next()))
      .toEqual(Array.from({ length: 20 }, () => second.next()));
    expect(first.calls).toBe(20);
  });

  it('Snapshot에서 이어 실행할 수 있다', () => {
    const original = new SeededRandom(42);
    Array.from({ length: 7 }, () => original.next());
    const restored = SeededRandom.fromSnapshot(original.snapshot());

    expect(restored.next()).toBe(original.next());
    expect(restored.snapshot()).toEqual(original.snapshot());
  });

  it('같은 Seed로 같은 Shuffle을 만든다', () => {
    const first = new SeededRandom(7);
    const second = new SeededRandom(7);
    const left = [1, 2, 3, 4, 5, 6];
    const right = [1, 2, 3, 4, 5, 6];

    expect(first.shuffleInPlace(left)).toEqual(second.shuffleInPlace(right));
  });
});
