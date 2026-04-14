# Sweet Crunch — Performance TODO

> 기준: 2026-04-10 기준 현재 상태
> 목표 기기: 저사양 Android (RAM 2GB, SD 600급)

---

## 현재 상태 (측정 기준점)

| 항목 | 값 | 비고 |
|------|-----|------|
| `public/assets/` 총 용량 | ~20MB | `_originals/` 39MB 삭제 후 |
| 오디오 sfx 파일 수 | 19개 | `_alt` 3개 삭제 후 |
| Vite 빌드 vendor-phaser 청크 | ~1.2MB (gzip) | manualChunks 설정 완료 |
| assetsInlineLimit | 4KB | base64 인라인 |
| optimizeDeps | phaser 포함 | dev 서버 첫 실행 속도 개선 |

---

## 완료된 최적화

### [DONE] 불필요 에셋 제거
- `public/assets/fx/_originals/` — 소스 원본 팩 (39MB, 1085파일) 삭제
- `public/assets/audio/sfx/swap_alt.ogg`, `tile_land_alt.ogg`, `win_jingle_alt.ogg` 삭제
- **파일**: `public/assets/` 직접 삭제 (코드 변경 없음)

### [DONE] Vite 빌드 최적화
- Phaser vendor 청크 분리 (`vendor-phaser`) — `manualChunks` 함수 형식으로 수정 (Vite 8/Rolldown 호환)
- `assetsInlineLimit: 4096` (소형 에셋 base64 인라인)
- `chunkSizeWarningLimit: 1500`
- `optimizeDeps.include: ['phaser']`
- **파일**: `vite.config.ts`
- **주의**: Vite 8은 Rolldown 사용 — `manualChunks`는 객체 형식 불가, 반드시 함수 형식 사용

### [DONE] BGM 레이지 로딩
- `bgm_title`만 BootScene에서 프리로드
- 게임플레이 BGM은 GameScene 진입 시 on-demand 로드
- **파일**: `src/scenes/BootScene.ts`, `SoundManager`

---

## 남은 최적화 항목

### P1 — 실기기 성능에 직접 영향

#### 1.1 FX 스프라이트시트 로드 최적화
- **현황**: BootScene에서 `spritesheets/` 내 모든 FX 시트를 앱 시작 시 일괄 로드
- **경로**: `public/assets/fx/spritesheets/`
- **문제**: 초기 로딩 시간 증가, 메모리 상주
- **제안**: 자주 사용되는 `match_burst`, `line_blast` 스프라이트만 프리로드, 나머지는 GameScene 시작 시 로드
- **파일**: `src/scenes/BootScene.ts` (`preload()` 내 FX 로딩 블록)

#### 1.2 파티클 이펙트 오브젝트 풀링
- **현황**: 매칭마다 `this.add.particles()` 신규 생성 추정
- **문제**: 빈번한 GC, 저사양 기기 프레임 드랍
- **제안**: 파티클 이미터를 미리 생성한 뒤 `setPosition()` + `explode()` 재사용
- **파일**: `src/scenes/GameScene.ts` (파티클 생성 부분)

#### 1.3 타일 컨테이너 재사용
- **현황**: 타일 낙하/생성 시 컨테이너 구조 확인 필요
- **제안**: `tileObjects[row][col]` 컨테이너를 파괴하지 않고 내용물(이미지, 텍스트)만 교체
- **파일**: `src/scenes/GameScene.ts:createTile()`, `refillTiles()`

---

### P2 — 배포 용량

#### 2.1 오디오 파일 압축 확인
- **현황**: `.ogg` 19개, 총 용량 미측정
- **목표**: 각 파일 ≤ 200KB, 총 sfx ≤ 3MB
- **명령**: `du -sh public/assets/audio/sfx/*.ogg | sort -h`
- **파일**: `public/assets/audio/sfx/`

#### 2.2 타일/UI 이미지 WebP 전환 검토
- **현황**: PNG 이미지 (`*.png` in `public/assets/`)
- **대상 파일**: `cupcake.png`, `donut.png`, `macaron.png`, `croissant.png`, `icecream.png`, `chocolate.png`, `ui/` 내 이미지
- **주의**: Capacitor WebView의 WebP 지원 확인 필요 (Android 4.4+ 지원)

#### 2.3 불필요 문서 파일 dist 포함 여부 확인
- **현황**: `*.md` 파일 17개가 루트에 존재
- **확인**: Vite 빌드 시 `public/` 이외 md 파일은 dist에 포함되지 않음 — 정상
- **조치 불필요**

---

### P3 — 장기 확장 대비

#### 3.1 LevelSelectScene 스크롤 퍼포먼스
- **현황**: 100레벨 격자 렌더링, 향후 500레벨 예정
- **문제**: 모든 버튼을 씬 초기화 시 일괄 생성하면 500레벨 기준 심각한 지연
- **제안**: 가상 스크롤 또는 현재 페이지 ±1페이지만 렌더링 (페이지당 20레벨 기준)
- **파일**: `src/scenes/LevelSelectScene.ts`

#### 3.2 GameScene 메모리 정리 강화
- **현황**: `destroy()` / `shutdown()` 시 timers, tweens 해제 필요
- **점검 항목**:
  - `idleShimmerTimer`, `idleHintTimer` null 처리
  - `this.tweens.killAll()` 호출
  - 파티클 이미터 `destroy()`
- **파일**: `src/scenes/GameScene.ts:shutdown()`

---

## 성능 측정 기준선 확인 방법

```bash
# 빌드 후 청크 크기 확인
npm run build 2>&1 | grep -E "\.js|\.css"

# 에셋 용량
du -sh public/assets/
du -sh public/assets/fx/
du -sh public/assets/audio/

# 개발 서버 번들 사이즈
npm run dev  # Vite HMR 로그에서 bundle size 확인
```

---

## 목표 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| 초기 JS 로드 (vendor 제외) | 미측정 | ≤ 300KB (gzip) |
| vendor-phaser 청크 | ~1.2MB | 변경 없음 (Phaser 크기) |
| 총 assets 용량 | ~20MB | ≤ 15MB (WebP 전환 후) |
| GameScene 첫 프레임 | 미측정 | ≤ 2초 (저사양 Android) |
| 매칭 애니메이션 FPS | 미측정 | ≥ 30fps (SD 600급) |
