# Sweet Crunch

AI와 협업해 만든 디저트 테마의 같은 그림 맞추기 퍼즐 게임입니다. Phaser 3와 TypeScript로 웹과 Android 빌드를 지원하며, 많은 레벨을 일관된 규칙으로 구성할 수 있는 데이터 구조를 만들었습니다.

## 게임 특징

- **8×8 게임판과 6종의 블록**: 컵케이크, 도넛, 마카롱, 크루아상, 아이스크림, 초콜릿
- **5종의 특수 블록**: 가로·세로 제거, 같은 색 제거, 폭탄과 교차 제거
- **3종의 장애물**: 여러 번 제거해야 하는 얼음, 이동을 막는 체인, 칸을 막는 돌
- **500개 레벨 데이터**: 난이도 구간, 세부 그룹, 생성 규칙과 개별 조정을 분리
- **연쇄 처리**: 제거, 낙하, 새 블록 생성, 재검사를 순서대로 수행
- **이동 횟수 제한**: 빠른 반응보다 목표와 이동 순서를 생각하는 퍼즐 구성

## 구현 구조

```text
src/
├── main.ts                  # 시작 지점
├── config.ts                # 게임 규칙과 색상 설정
├── scenes/
│   ├── BootScene.ts         # 리소스 불러오기
│   ├── TitleScene.ts        # 시작 화면
│   ├── LevelSelectScene.ts  # 레벨 선택
│   ├── GameScene.ts         # 게임 진행
│   └── SettingsScene.ts     # 사용자 설정
├── data/
│   ├── levelBands.ts        # 난이도 구간
│   ├── levelPods.ts         # 구간 안의 세부 그룹
│   ├── levelTemplates.ts    # 레벨 생성 규칙
│   ├── levelFactories.ts    # 레벨 데이터 생성
│   └── levelOverrides.ts    # 특정 레벨 개별 조정
├── utils/                   # 사운드, 광고, 설정, 화면 전환
└── shaders/                 # WebGL 화면 효과
```

## 레벨 데이터 구성

500개 레벨을 모두 손으로 작성하지 않고 여러 단계의 규칙을 조합해 생성합니다.

| 단계 | 파일 | 역할 |
|---|---|---|
| 난이도 구간 | `levelBands.ts` | 쉬움, 보통, 어려움과 같은 큰 범위 |
| 세부 그룹 | `levelPods.ts` | 각 구간 안의 목표와 장애물 조합 |
| 생성 규칙 | `levelTemplates.ts` | 목표, 장애물, 이동 횟수 규칙 |
| 데이터 생성 | `levelFactories.ts` | 규칙을 실제 레벨 데이터로 변환 |
| 개별 조정 | `levelOverrides.ts` | 특별히 조정할 레벨만 수정 |

## 디자인 방향

강한 네온 색상 대신 작은 디저트 가게의 메뉴판을 떠올릴 수 있는 부드러운 화면을 목표로 했습니다.

- 역할에 따라 나눈 20개 이상의 색상 값
- 선 대신 색상 차이와 그라데이션으로 영역 구분
- 반투명 화면과 흐림 효과
- Plus Jakarta Sans를 활용한 글자 크기 체계

## AI와 협업한 방식

- 게임 규칙과 화면 구성을 문서로 정리했습니다.
- 기능을 작은 작업으로 나누고 구현 초안과 검토를 반복했습니다.
- 많은 레벨을 수작업으로 작성하지 않도록 데이터 생성 규칙을 설계했습니다.
- Google Stitch로 만든 화면 시안을 Phaser 3 화면으로 옮기는 규칙을 정리했습니다.

## 사용 기술

| 구분 | 기술 |
|---|---|
| 게임 프레임워크 | Phaser 3 |
| 언어 | TypeScript |
| 빌드 도구 | Vite |
| Android 빌드 | Capacitor |
| 광고 | AdMob |
| 화면 효과 | WebGL Custom Pipeline |
| 배포 | GitHub Pages, Android 빌드 |
| AI 협업 | Claude Code |

## 실행 방법

```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 배포용 빌드
npm run build

# Android 프로젝트 열기
npm run cap:android
```

## 링크

- [웹에서 실행](https://aile1492.github.io/sweet-crunch/)
- [Notion 상세 페이지](https://app.notion.com/p/34213eca65878176b367f96fc2f7ef0d)
- [전체 포트폴리오](https://app.notion.com/p/33413eca6587815c98e5da909b315272)
