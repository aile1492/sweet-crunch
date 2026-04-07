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

## 명령어
- `npm run dev` — 개발 서버 (localhost:3000)
- `npm run build` — 프로덕션 빌드 (dist/)
- `npm run preview` — 빌드 결과 미리보기
