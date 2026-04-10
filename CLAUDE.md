# Sweet Crunch — Match-3 퍼즐 게임

## 기술 스택
- **엔진:** Phaser 3 (v3.90+)
- **언어:** TypeScript (strict mode)
- **빌드:** Vite
- **배포:** Capacitor (추후 추가)

## 프로젝트 구조
```
src/
├── main.ts          # 엔트리포인트
├── config.ts        # 게임 설정 (해상도, 그리드, 타일 타입)
├── scenes/          # Phaser Scene 파일
│   ├── BootScene.ts # 에셋 로딩
│   └── GameScene.ts # 메인 게임플레이
├── objects/         # 게임 오브젝트 클래스
└── utils/           # 유틸리티 함수
public/assets/       # 게임 에셋 (이미지, 사운드)
```

## 게임 규칙
- 8x8 그리드, 타일 6종 (cupcake, donut, macaron, croissant, icecream, chocolate)
- 인접 타일 스왑으로 3개 이상 매칭
- 매칭 시 제거 → 중력 낙하 → 새 타일 → 연쇄(cascade) 반복
- 이동 횟수 제한 방식 (시간 제한 아님)

## 해상도
- 기준: 1080 x 1920 (9:16 세로)
- Phaser Scale.FIT + CENTER_BOTH

## 코딩 컨벤션
- Scene별로 파일 분리
- 게임 상수는 config.ts에 집중
- 타일 좌표 계산은 config의 BOARD_OFFSET_X/Y, TILE_TOTAL 사용

## Stitch HTML → Phaser 변환 규칙

Google Stitch에서 생성된 HTML/CSS를 Phaser 3 Scene 코드로 변환할 때 아래 규칙을 따른다.

### 좌표 체계
- 게임 캔버스: 1080 x 1920 (config.ts GAME_WIDTH/GAME_HEIGHT)
- Stitch가 모바일 뷰포트(375x812)로 출력한 경우 스케일 팩터 적용: X=2.88, Y=2.36
- Stitch가 1080 기준으로 출력한 경우 1:1 사용
- Phaser는 중심점 기준 좌표 (setOrigin 기본 0.5)

### CSS → Phaser 매핑
| CSS | Phaser |
|-----|--------|
| `background-color: #690008` | `graphics.fillStyle(0x690008, 1)` |
| `border-radius: 40px` | `graphics.fillRoundedRect(x, y, w, h, 40)` |
| `box-shadow: 0 8px 24px rgba(R,G,B,A)` | 별도 Graphics 레이어, Y+8 오프셋, alpha=A |
| `linear-gradient(deg, A, B)` | 상단 fillStyle(colorB) + 하위 fillStyle(colorA) |
| `font-size: 48px` | `{ fontSize: '48px' }` |
| `font-weight: 700` | `{ fontStyle: 'bold' }` |
| `letter-spacing: 0.1em` | `{ letterSpacing: N }` (N = fontSize * 0.1) |
| `opacity: 0.7` | `.setAlpha(0.7)` |
| `display: flex; gap: Npx` | 수동 좌표 계산, gap 값 반영 |
| `transform: rotate(-12deg)` | `container.setAngle(-12)` |
| `color: #782E3D` | `{ color: '#782E3D' }` (텍스트) 또는 `0x782e3d` (Graphics) |

### 색상 변환
- CSS hex `#690008` → Phaser hex `0x690008`
- CSS `rgb(105,0,8)` → `0x690008` ((r<<16)|(g<<8)|b)
- Tailwind 커스텀 `text-[#782E3D]` → `0x782e3d`
- config.ts의 COLORS 상수 우선 사용

### 레이아웃 원칙
- 게임 보드, 타일 등 핵심 게임플레이 → Phaser 네이티브 렌더링
- 복잡한 정적 UI (설정 메뉴 등) → 필요 시 Phaser DOM Element 활용 가능
- 모든 좌표는 config.ts 상수 기반으로 계산 (BOARD_OFFSET_X/Y, TILE_TOTAL 등)

## 명령어
- `npm run dev` — 개발 서버 (localhost:3000)
- `npm run build` — 프로덕션 빌드 (dist/)
- `npm run preview` — 빌드 결과 미리보기
