# Phaser 3 패턴 — Sweet Crunch 공통 패턴

> 프로젝트 전반에서 반복되는 Phaser 3 구현 패턴 모음 <!-- coverage: high -->

## 관련 토픽
- [game-scene](../topics/game-scene.md)
- [ui-scenes](../topics/ui-scenes.md)
- [tech-stack](../topics/tech-stack.md)

---

## 1. isAnimating 플래그 패턴
**모든 애니메이션 구간에서 입력 차단:**
```typescript
if (this.isAnimating) return;
this.isAnimating = true;
this.tweens.add({
  ...,
  onComplete: () => { this.isAnimating = false; }
});
```
Phaser Tween은 비동기이므로, 중복 입력 방지를 위해 필수.

## 2. depth 레이어 체계
모든 씬에서 동일한 depth 관례:
```
0-4:   배경, 보드
5-9:   타일, 게임 오브젝트
10-19: 인터랙션 존 (Zone)
20-39: 파티클, 이펙트
40-49: 고정 UI 영역 (하단 바, 광고)
50-59: HUD (상단 정보)
60+:   팝업, 오버레이
```

## 3. fadeToScene 전환 패턴
씬 전환은 항상 `fadeToScene()` 사용 (직접 `scene.start()` 금지):
```typescript
import { fadeToScene, fadeIn } from '../utils/SceneTransition';
// 씬 이동
fadeToScene(this, 'GameScene', { level: levelNum });
// 씬 진입 시
create(): void { fadeIn(this); ... }
```

## 4. 컨테이너 기반 씬 패턴 (LevelSelect)
스크롤 가능한 컨텐츠는 Container에 담고 y 위치로 스크롤:
```typescript
this.scrollContainer = this.add.container(0, 0);
// 컨텐츠를 scrollContainer.add()
// 스크롤: this.scrollContainer.y = -this.scrollY;
```
고정 UI는 Container 밖, depth 높게 설정.

## 5. 병렬 배열 패턴 (grid + specialGrid)
게임 상태를 여러 병렬 배열로 관리:
```typescript
grid[row][col]: TileData          // 타일 타입/좌표
specialGrid[row][col]: SpecialType|null  // 특수 젬 상태
tileObjects[row][col]: Container|null    // 렌더링 오브젝트
```
스왑/낙하/셔플 시 항상 세 배열 동시 업데이트.

## 6. SoundManager 패턴
씬에서 사운드 초기화:
```typescript
create(): void {
  SoundManager.getInstance().setScene(this);
  this.input.once('pointerdown', () => SoundManager.getInstance().ensureContext());
}
```
`ensureContext()`는 반드시 사용자 인터랙션 콜백 안에서 호출.

## 7. AdMob 배너 패턴
AdMob이 필요한 씬:
```typescript
import { showBanner, removeBanner } from '../utils/AdMobManager';

create(): void {
  // ... 씬 초기화
  showBanner();  // 마지막에 호출
}

shutdown(): void {
  removeBanner();
}
```

---
*Last compiled: 2026-04-10*
