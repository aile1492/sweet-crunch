# Stitch 프롬프트 모음

> Stitch에 전체 화면을 한 번에 생성 요청.
> 생성된 타일 디자인은 Recraft 에셋 제작 시 스타일 레퍼런스로 활용.

---

## 공통 스타일 지시 (모든 프롬프트 앞에 붙이기)

```
Style guide:
- Minimal flat illustration, soft gradients, no outlines
- Warm cozy bakery feel
- Background: warm cream (#FFF8F0)
- Board background: soft beige (#F5E6D3), rounded corners
- Font: Nunito (rounded sans-serif), dark brown text (#4A3728)
- Color palette: soft pink (#FF9BAA), lavender (#C4A7E7), mint green (#A8E6CF), warm gold (#FFD07B), sky blue (#89CFF0), cocoa brown (#A0725B)
- Accent color: coral (#FF6F61)
- Canvas size: 1080 x 1920 px (mobile portrait, 9:16)
- All buttons: fully rounded ends (pill shape), large touch-friendly
- Overall mood: cute, cozy, pastel bakery
```

---

## 화면 1: 타이틀 / 메인 메뉴

```
Design a mobile game title screen for a dessert-themed match-3 puzzle game called "Sweet Crunch".

Layout (top to bottom):
- Top area: Decorative dessert illustrations (small cupcakes, macarons floating)
- Center: Game logo "Sweet Crunch" in playful rounded typography, warm gold color with subtle shadow
- Below logo: A large pink pill-shaped "PLAY" button (480x120px feel)
- Below play button: Two smaller buttons side by side — "Recipe Book" (left) and "Settings" (right)
- Bottom: Subtle decorative elements (sprinkles pattern or small pastry icons)

The background should have a very subtle pattern like tiny sprinkles or dots on warm cream.
No characters, no complex scenes — keep it clean and minimal.
```

---

## 화면 2: 레벨 선택 (맵)

```
Design a level select map screen for a dessert-themed match-3 game "Sweet Crunch".

Layout:
- Top bar: "French Classics" category title with a small French flag icon, and a back arrow button on the left
- Main area: A vertical scrolling path with level nodes
  - Show levels 1 through 12 as circular nodes along a winding dotted path
  - Completed levels: filled with coral color (#FF6F61), showing 1-3 small stars below
  - Current level: larger node, glowing/pulsing, gold color
  - Locked levels: gray with a small lock icon
- Background: warm cream with faint bakery-themed decorative elements (croissants, baguettes for French theme)
- Bottom: Small banner area for future ad placement (just a subtle placeholder line)

Keep the path playful with gentle curves. Minimal and clean.
```

---

## 화면 3: 레벨 시작 팝업

```
Design a level start popup overlay for a dessert match-3 game.

Background: dimmed (50% black overlay over the game screen)

Popup card (centered, rounded corners 40px, white background):
- Top: "Level 7" in large bold text
- Middle section — "Goals":
  - Icon of a cupcake tile + "x30" text (collect 30 cupcakes)
  - Icon of an ice obstacle + "x10" text (break 10 ice tiles)
- Below goals: "Moves: 25" with a shoe/step icon
- Divider line
- "Boosters" section: 3 circular slots showing:
  - Spatula icon (with "+1" badge)
  - Mixer icon (with "+2" badge)
  - Empty slot with "+" icon
- Bottom: Large coral "START" pill button

Clean, minimal, easy to read at a glance.
```

---

## 화면 4: 게임 플레이 (핵심 화면)

```
Design the main gameplay screen for a dessert-themed match-3 puzzle game "Sweet Crunch".

Layout (1080x1920, top to bottom):

TOP HUD (y: 64-264px):
- Left: Goal icon (cupcake) with "x30" counter and small progress bar below it
- Center: Score display "4,500" in large bold text
- Right: Moves counter in a circular badge showing "25"

GAME BOARD (y: 304-1384px, centered):
- 8x8 grid of dessert tiles on a soft beige rounded rectangle board
- Tile size: 120x120px with 8px gaps
- 6 tile types, each clearly distinct in both color AND shape:
  1. Cupcake — soft pink, round top with cherry
  2. Donut — lavender, circle with hole
  3. Macaron — mint green, two stacked flat circles
  4. Croissant — warm gold, crescent shape
  5. Ice cream — sky blue, cone with round scoop
  6. Chocolate — cocoa brown, square with grid pattern
- Show a few tiles highlighted (selected state with subtle glow)
- Include 2-3 ice-covered tiles (frosted glass overlay effect on tiles)

BOTTOM BAR (y: 1424-1624px):
- Three booster buttons in a row (120x120px, rounded):
  - Spatula icon
  - Mixer icon
  - Pause/menu icon (smaller, rightmost)

Background: warm cream (#FFF8F0) visible above and below the board.
Board background: soft beige (#F5E6D3) with rounded corners.

This is the most important screen. Make the tiles look delicious, distinct, and satisfying.
The overall feel should be cozy and clean — not cluttered.
```

---

## 화면 5: 레벨 클리어 팝업

```
Design a level complete popup for a dessert match-3 game.

Background: dimmed game screen

Popup card (centered, white, rounded 40px):
- Top: Celebration effect — small confetti/sprinkles decorations
- "Level Complete!" text in gold
- Three stars in a row (show 2 filled gold stars, 1 empty gray star for 2-star result)
- Score: "12,450" in large bold text
- Divider
- "Recipe Piece Earned!" section:
  - Show a card/stamp of a croissant illustration with a "1/3" badge
  - Small text: "Croissant — collect 2 more pieces"
- Bottom buttons:
  - "Next Level" — large coral pill button
  - "Menu" — smaller text button below

Celebratory but not overwhelming. Keep the minimal aesthetic.
```

---

## 화면 6: 레벨 실패 팝업

```
Design a level failed popup for a dessert match-3 game.

Background: dimmed game screen

Popup card (centered, white, rounded 40px):
- Top: Sad/deflated cupcake icon (cute, not depressing)
- "Out of Moves!" text in dark brown
- "So close! You needed 5 more cupcakes." helper text
- Divider
- Two options:
  - "+5 Moves" button with a small play/video icon (watch ad for extra moves) — coral pill button
  - "Try Again" — secondary outlined pill button below
  - "Quit" — small text link at the bottom

Gentle and encouraging tone, not punishing. Keep it cozy.
```

---

## 화면 7: 도감 (Recipe Book)

```
Design a recipe collection book screen for a dessert match-3 game "Sweet Crunch".

Layout:
- Top bar: "Recipe Book" title centered, back arrow on left
- Tab bar below title: Category tabs — "French" (active, underlined coral), "Japanese" (locked, gray), "Korean" (locked), "Italian" (locked), "American" (locked)
- Main content: A 2-column grid of recipe cards
  - Each card: rounded rectangle, showing:
    - Dessert illustration (e.g., croissant, éclair, crème brûlée)
    - Name below the illustration
    - Progress: "2/3 pieces" with a small progress bar
  - Completed recipe cards: full color with a gold checkmark badge
  - Incomplete recipe cards: slightly desaturated with progress indicator
  - Locked recipe cards: silhouette only with "?"
- Show 6 cards visible (3 rows x 2 columns)

Background: warm cream. Cards on white with subtle shadow.
Feels like flipping through a cozy recipe journal.
```

---

## 화면 8: 설정

```
Design a settings screen for a dessert match-3 game "Sweet Crunch".

Layout:
- Top bar: "Settings" title centered, back arrow on left
- Settings card (centered white rounded rectangle):
  - Music: label + toggle switch (coral when on)
  - Sound Effects: label + toggle switch
  - Vibration: label + toggle switch
  - Language: label + dropdown showing "English"
  - Divider
  - "Restore Purchases" text button
  - "Privacy Policy" text button
- Bottom area: App version "v1.0.0" in small gray text

Very clean and simple. Standard mobile settings pattern.
```

---

## 사용 방법

1. **공통 스타일 지시**를 먼저 입력
2. 각 화면 프롬프트를 순서대로 입력
3. 가장 중요한 화면: **화면 4 (게임 플레이)** — 여기서 타일 스타일이 결정됨
4. 게임 플레이 화면에서 나온 타일 디자인을 Recraft 에셋 제작 시 스타일 레퍼런스로 사용

---

*작성일: 2026-04-07*
