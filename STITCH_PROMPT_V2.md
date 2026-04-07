# Stitch 프롬프트 V2 (한 번에 붙여넣기용)

> 아래 전체를 Stitch에 한 번에 붙여넣기

---

```
Design all 8 screens for a mobile match-3 puzzle game called "Sweet Crunch".
Theme: dessert / bakery. Art style: minimal flat illustration with soft gradients.

=== GLOBAL STYLE RULES (APPLY TO ALL SCREENS) ===

CRITICAL:
- Do NOT use realistic photos or photographs ANYWHERE. Every image, icon, decoration, and dessert illustration must be flat minimal vector-style illustrations with soft gradients. No photographs, no 3D renders, no realistic textures.
- Do NOT include a bottom navigation bar (no tab bar at the bottom). Use simple back arrows and menu buttons for navigation instead.
- All dessert illustrations must share the same flat illustration style — simple shapes, no outlines, soft color fills with subtle gradients.

Colors:
- Background: warm cream (#FFF8F0)
- Board/card background: soft beige (#F5E6D3)
- Tile 1 Cupcake: soft pink (#FF9BAA)
- Tile 2 Donut: lavender (#C4A7E7)
- Tile 3 Macaron: mint green (#A8E6CF)
- Tile 4 Croissant: warm gold (#FFD07B)
- Tile 5 Ice cream: sky blue (#89CFF0)
- Tile 6 Chocolate: cocoa brown (#A0725B)
- Primary buttons & accents: dark red (#8B1A1A)
- Text: dark brown (#4A3728)
- Secondary buttons: warm beige (#F0E0CC)

Typography: Nunito (rounded sans-serif), bold for headings, regular for body.
Canvas: 1080 x 1920 px (mobile portrait 9:16).
All buttons: pill-shaped (fully rounded ends), large and touch-friendly.
Overall mood: cute, cozy, warm bakery, clean and minimal.

=== SCREEN 1: TITLE / MAIN MENU ===

Layout (top to bottom):
- Top area: Small flat dessert illustrations floating as decoration (cupcake, macaron, donut — all flat vector style, NOT photos)
- Center: Game logo "Sweet Crunch" in playful rounded bold typography, dark red color
- Below logo: Subtitle "THE GOURMET BAKERY PUZZLE" in small caps, warm brown
- Large dark red pill-shaped "PLAY" button (480x120px)
- Below: Two smaller beige pill buttons side by side — "Recipes" (with a book icon) and "Settings" (with a gear icon)
- Bottom: Subtle sprinkle pattern decoration
- Background: warm cream with faint dot/sprinkle pattern

No bottom navigation bar. No realistic images.

=== SCREEN 2: LEVEL SELECT MAP ===

Layout:
- Top bar: Back arrow (left), "French Classics" title with small French flag flat icon (center), settings gear (right)
- Main area: Vertical scrolling path with level nodes connected by a winding dotted line
  - Levels 1-4: Completed — coral filled circles with level number, 1-3 small gold stars below each
  - Level 5: Current level — larger gold circle, subtle glow effect
  - Levels 6-12: Locked — gray circles with small lock icon
- Small flat dessert illustrations as path decorations (tiny croissant, baguette — flat vector, NOT photos)
- Bottom area: Subtle "Ad Space" placeholder text in gray
- Background: warm cream

No bottom navigation bar.

=== SCREEN 3: LEVEL START POPUP ===

Background: Dimmed (50% black overlay over blurred game screen)

Centered popup card (white, rounded corners 40px):
- Top: "BAKERY CHALLENGE" small label in dark red
- "Level 7" in large bold text
- Section "GOALS":
  - Cupcake flat icon (pink circle) + "x30"
  - Ice/snowflake flat icon (blue circle) + "x10"
- "Moves: 25" with a small footstep icon
- Divider line
- "SELECT BOOSTERS" section: 3 circular slots
  - Spatula icon with "+1" gold badge
  - Mixer icon with "+2" gold badge
  - Empty slot with "+" dashed border
- Large dark red "START" pill button at bottom
- Small "X" close button at top right of popup

Popup must be centered on screen, not offset.

=== SCREEN 4: GAMEPLAY (MOST IMPORTANT SCREEN) ===

Layout (1080x1920, top to bottom):

TOP HUD (y: 64-264px):
- Left: Goal — flat cupcake icon in pink circle + "x30" text + small progress bar below
- Center: "SCORE" label above, "4,500" in large bold dark brown text
- Right: "MOVES" label above, "25" in large bold text inside a coral circle badge

GAME BOARD (y: 304-1384px, centered):
- Soft beige rounded rectangle (radius 32px) as board background
- 8x8 grid of dessert tiles with 8px gaps between tiles
- Exactly 6 tile types, each MUST be clearly distinct in BOTH color AND shape:
  1. Cupcake — soft pink circle, round cream top with small cherry, simple flat style
  2. Donut — lavender circle with a visible hole in the center
  3. Macaron — mint green, two stacked flat ovals (sandwich cookie shape)
  4. Croissant — warm gold, crescent/moon shape
  5. Ice cream — sky blue, triangular cone bottom with round scoop on top
  6. Chocolate — cocoa brown, small square with grid lines
- All tiles must be flat illustrations with soft gradients, NO outlines, NO realistic textures
- Show 2-3 tiles with a frosted glass overlay (ice obstacle)
- Show one tile pair with a subtle selection glow (as if being swapped)

BOTTOM BAR (y: 1424-1624px):
- Three circular buttons in a row:
  - Spatula icon with count badge "5"
  - Mixer icon with count badge "3"
  - Pause icon (smaller, right side)

Background: warm cream (#FFF8F0) visible above and below the board.

THIS IS THE MOST IMPORTANT SCREEN. Make tiles look delicious, clearly distinct from each other, and satisfying. Keep it clean and not cluttered.

=== SCREEN 5: LEVEL COMPLETE POPUP ===

Background: Dimmed game screen

Centered popup card (white, rounded 40px):
- Top: Small colorful confetti/sprinkle decorations (flat style)
- "Level Complete!" in playful bold dark red text
- Three stars in a row: 2 filled gold stars, 1 empty gray star
- "SCORE" label, "12,450" in large bold text
- Divider line
- "RECIPE PIECE EARNED!" badge label in dark red
- Recipe card: flat illustration of a croissant + "Croissant" name + "collect 2 more pieces" + "1/3" progress badge
- Large dark red "Next Level" pill button
- "MENU" small text link below

Celebratory but minimal. No realistic images.

=== SCREEN 6: LEVEL FAILED POPUP ===

Background: Dimmed game screen

Centered popup card (white, rounded 40px):
- Top: A sad/deflated flat cupcake illustration (drooping cream, cute sad expression) — NOT a generic emoji face, must be a dessert character in flat style
- "Out of Moves!" in bold dark brown text
- "So close! You needed 5 more cupcakes to complete this recipe." in regular text, with "5 more cupcakes" highlighted in dark red
- Divider line
- Dark red pill button: play/video icon + "+5 MOVES" (watch ad for extra moves)
- Beige pill button: retry icon + "TRY AGAIN"
- Small text link: "QUIT TO BAKERY"

Gentle and encouraging tone. Flat illustration style only.

=== SCREEN 7: RECIPE BOOK ===

Layout:
- Top bar: Back arrow (left), "Recipes" title (center), settings gear (right)
- Category tabs: "French" (active — dark red filled pill), "Japanese" (locked — beige with lock icon), "Korean" (locked)
- Main content: 2-column grid of recipe cards (3 rows visible = 6 cards)
  - Completed card: Flat dessert illustration (e.g., croissant) + name + "3/3 PIECES" with full progress bar + gold checkmark badge
  - In-progress card: Flat dessert illustration (e.g., éclair) + name + "2/3 PIECES" with partial progress bar
  - In-progress card: Flat dessert illustration (e.g., crème brûlée) + name + "1/3 PIECES"
  - Locked cards: "?" icon with dashed border + "Locked" text
- Bottom: "Mastery Progress" bar — "Collect 5 French recipes for a bonus!" + "20%" indicator
- Cards have white background with subtle shadow, on warm cream page background

ALL dessert illustrations in recipe cards must be flat vector style, NOT photographs.
No bottom navigation bar.

=== SCREEN 8: SETTINGS ===

Layout:
- Top bar: Back arrow (left), "Settings" title (center)
- Small flat decorative dessert illustration at top (warm, minimal)
- White rounded card containing:
  - Music: flat note icon (pink circle) + label + dark red toggle switch (ON)
  - Sound Effects: flat speaker icon (gold circle) + label + dark red toggle switch (ON)
  - Vibration: flat vibration icon (red circle) + label + gray toggle switch (OFF)
  - Divider
  - LANGUAGE section: "English" in a beige dropdown selector
  - Divider
  - "Restore Purchases" text link in dark red
  - "Privacy Policy" text link in dark red
- Bottom: "V1.0.0 — FRESHLY BAKED" in small gray text

Simple, clean, standard mobile settings layout.
No bottom navigation bar. No realistic photos — flat illustrations only.
```

---

*V2 변경사항: 실사 이미지 금지 강조, 하단 내비바 제거, 타일 6종 명확화, 레벨 실패 이모지→시무룩한 컵케이크, 팝업 중앙 정렬 지시*
