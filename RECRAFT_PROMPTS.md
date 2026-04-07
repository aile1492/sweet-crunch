# Recraft 프롬프트 — D-4 타일/에셋 제작

## Recraft 설정 (모든 에셋 공통)

| 설정 | 값 |
|---|---|
| **Style** | Vector illustration (또는 "Flat 2.0" 스타일) |
| **Ratio** | 1:1 (정사각형) |
| **Count** | 1 (하나씩 정밀 생성) 또는 6 (한 번에 세트) |
| **배경** | 생성 후 Background Remover로 투명 배경 처리 |
| **Export** | PNG (256x256 이상), 투명 배경 |

---

## 1단계: 기본 타일 6종 (한 번에 세트 생성 시도)

### 프롬프트 A — 6종 세트 한번에 생성

```
A set of 6 dessert icons for a mobile puzzle game, flat vector illustration style, soft pastel colors, no outlines, subtle gradients, white background, each icon clearly distinct in shape and color:

1. Cupcake — soft pink (#FF9BAA), round cream swirl on top with a small cherry, small ribbed base
2. Donut — lavender purple (#C4A7E7), circular ring shape with a visible hole in the center, small sprinkles on top
3. Macaron — mint green (#A8E6CF), two round flat discs stacked with cream filling visible between them
4. Croissant — warm golden yellow (#FFD07B), classic crescent moon curved shape with subtle layer lines
5. Ice cream cone — sky blue (#89CFF0), triangular waffle cone bottom with one round scoop on top
6. Chocolate square — cocoa brown (#A0725B), small square shape with 2x2 grid lines on surface

Style: minimal, cute, rounded shapes, game-ready icons. Each dessert must be a simple recognizable silhouette. No text, no complex details, no realistic textures.
```

> 세트로 잘 안 나오면 아래 개별 프롬프트를 사용

---

### 프롬프트 B — 개별 생성 (세트가 잘 안 나올 때)

#### 타일 1: 컵케이크

```
A single cupcake icon, flat vector illustration, soft pink color (#FF9BAA), round cream swirl on top with a tiny red cherry, small ribbed paper base, minimal style, cute and rounded, soft gradient, no outline, white background, game tile icon
```

#### 타일 2: 도넛

```
A single donut icon, flat vector illustration, lavender purple color (#C4A7E7), circular ring shape with a clear hole in the center, tiny colorful sprinkles on top, minimal style, cute and rounded, soft gradient, no outline, white background, game tile icon
```

#### 타일 3: 마카롱

```
A single macaron icon, flat vector illustration, mint green color (#A8E6CF), two round flat discs stacked with cream filling visible between them, minimal style, cute and rounded, soft gradient, no outline, white background, game tile icon
```

#### 타일 4: 크루아상

```
A single croissant icon, flat vector illustration, warm golden yellow color (#FFD07B), classic crescent moon curved shape with subtle layer lines, minimal style, cute and rounded, soft gradient, no outline, white background, game tile icon
```

#### 타일 5: 아이스크림

```
A single ice cream cone icon, flat vector illustration, sky blue color (#89CFF0), triangular waffle cone in light beige at bottom with one round blue scoop on top, minimal style, cute and rounded, soft gradient, no outline, white background, game tile icon
```

#### 타일 6: 초콜릿

```
A single chocolate square icon, flat vector illustration, cocoa brown color (#A0725B), small square shape with 2x2 grid lines on surface, minimal style, cute and rounded corners, soft gradient, no outline, white background, game tile icon
```

---

## 2단계: 특수 타일 3종

#### Rolling Pin (밀대) — 4매치 특수 타일

```
A single rolling pin icon, flat vector illustration, white and warm beige colors, horizontal wooden rolling pin with two round handles, subtle wood grain pattern, a glowing golden stripe effect across the middle to indicate power, minimal style, cute, no outline, white background, game power-up icon
```

#### Oven Bomb (오븐 폭탄) — L/T매치 특수 타일

```
A single cute oven icon, flat vector illustration, warm red and cream colors, small rounded oven shape with a circular window showing orange glow inside, tiny explosion/spark lines around it, minimal style, cute and rounded, no outline, white background, game power-up icon
```

#### Golden Whisk (황금 거품기) — 5매치 특수 타일

```
A single golden whisk icon, flat vector illustration, bright gold and yellow colors, balloon whisk shape with golden sparkle effects around it, rainbow subtle gradient shimmer, minimal style, elegant but cute, no outline, white background, game power-up icon
```

---

## 3단계: 장애물 오버레이

#### Ice (아이싱) 오버레이

```
A transparent ice crystal overlay for a game tile, flat vector illustration, light blue and white, cracked ice surface with subtle frost pattern, semi-transparent look, square shape with rounded corners, minimal style, no outline, white background, game obstacle overlay
```

#### Double Ice 오버레이

```
A thick ice crystal overlay for a game tile, flat vector illustration, deeper blue and white, dense cracked ice surface with prominent frost crystals, more opaque than single ice, square shape with rounded corners, minimal style, no outline, white background, game obstacle overlay
```

#### Chocolate Spread 오버레이

```
A chocolate spread overlay for a game tile, flat vector illustration, dark brown dripping chocolate, gooey melted texture covering the tile, square shape with rounded corners, minimal style, no outline, white background, game obstacle overlay
```

---

## 4단계: UI 아이콘

#### 부스터 — 뒤집개 (Spatula)

```
A single spatula icon, flat vector illustration, silver gray metal blade with warm brown wooden handle, minimal style, cute kitchen utensil, no outline, white background, game UI icon
```

#### 부스터 — 믹서 (Mixer)

```
A single stand mixer icon, flat vector illustration, warm red body color with silver bowl, cute small kitchen appliance, minimal style, rounded shapes, no outline, white background, game UI icon
```

#### 기타 UI 아이콘

```
A set of minimal flat vector UI icons for a bakery puzzle game, white background, no outlines, soft colors:
- Pause button (two vertical bars)
- Settings gear
- Music note
- Sound speaker
- Star (gold, for ratings)
- Lock icon (gray)
- Heart (red, for lives)
- Back arrow
All icons in the same consistent flat minimal style, warm color tones
```

---

## 작업 순서

1. **기본 타일 6종** 먼저 (프롬프트 A 시도 → 안 되면 B 개별 생성)
2. 마음에 드는 타일이 나오면 → **스타일 레퍼런스로 고정**
3. 같은 스타일로 **특수 타일 3종** 생성
4. **장애물 오버레이** 생성
5. **UI 아이콘** 생성
6. 모든 에셋 **Background Remover로 투명 배경** 처리
7. **256x256 PNG**로 Export

## 폴더 구조 (Export 후)

```
assets/
├── tiles/
│   ├── cupcake.png
│   ├── donut.png
│   ├── macaron.png
│   ├── croissant.png
│   ├── icecream.png
│   └── chocolate.png
├── specials/
│   ├── rolling_pin.png
│   ├── oven_bomb.png
│   └── golden_whisk.png
├── obstacles/
│   ├── ice.png
│   ├── ice_double.png
│   └── chocolate_spread.png
├── ui/
│   ├── spatula.png
│   ├── mixer.png
│   ├── pause.png
│   ├── settings.png
│   ├── star.png
│   ├── lock.png
│   ├── heart.png
│   └── back_arrow.png
└── backgrounds/
    └── (나중에 추가)
```

---

*작성일: 2026-04-07*
