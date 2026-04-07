# Stitch 프롬프트 V3 — 3개 화면 수정 재생성용

> 아래 전체를 Stitch에 한 번에 붙여넣기

---

```
Redesign only 3 screens for the mobile match-3 puzzle game "Sweet Crunch".
These screens need fixes. All other screens are already approved.

=== GLOBAL STYLE RULES (APPLY TO ALL 3 SCREENS) ===

CRITICAL RULES — READ CAREFULLY:
1. ABSOLUTELY NO realistic photos, NO photographs, NO 3D renders, NO realistic textures. Every single image must be FLAT VECTOR ILLUSTRATION with simple shapes and soft gradients. This includes dessert images in recipe cards.
2. ABSOLUTELY NO bottom navigation bar / tab bar. No tabs at the bottom of any screen. Navigation is done with back arrows and buttons only.
3. All dessert illustrations must look like they belong in the same game — simple flat shapes, soft color fills, minimal detail, no outlines.

Colors:
- Background: warm cream (#FFF8F0)
- Board/card background: soft beige (#F5E6D3)
- Tile 1 Cupcake: soft pink (#FF9BAA) — round cream top with cherry
- Tile 2 Donut: lavender (#C4A7E7) — circle with hole in center
- Tile 3 Macaron: mint green (#A8E6CF) — two stacked flat ovals
- Tile 4 Croissant: warm gold (#FFD07B) — crescent moon shape
- Tile 5 Ice cream: sky blue (#89CFF0) — cone with round scoop
- Tile 6 Chocolate: cocoa brown (#A0725B) — small square with grid lines
- Primary buttons & accents: dark red (#8B1A1A)
- Text: dark brown (#4A3728)

Typography: Nunito (rounded sans-serif).
Canvas: 1080 x 1920 px (mobile portrait 9:16).
Mood: cute, cozy, warm bakery, clean minimal.

=== SCREEN A: GAMEPLAY (THIS IS THE MOST IMPORTANT SCREEN) ===

This screen was badly generated before. The board was cut off and tiles were wrong. Please follow these specifications EXACTLY.

Layout (1080x1920, top to bottom):

TOP HUD (top area, below status bar safe zone):
- Left side: Goal section — small cupcake flat icon in pink circle + "30" text + thin progress bar below
- Center: "SCORE" small label above, "4,500" in large bold dark brown text below
- Right side: "MOVES" small label above, coral/pink circle badge with "25" in bold white text

GAME BOARD (center of screen, takes up most of the space):
- Large soft beige (#F5E6D3) rounded rectangle as board background, rounded corners 32px
- MUST contain a FULL 8 columns x 8 rows grid = 64 tiles total. Do NOT cut off rows. All 8 rows must be visible.
- Tile size: approximately 120x120px with small gaps between each tile
- The board should be roughly square shaped (8x8 grid)
- EXACTLY 6 tile types. Each tile sits on a white or light circular/rounded background:

  1. CUPCAKE — soft pink (#FF9BAA). Shape: round cream swirl on top of a small base, tiny cherry on top. Flat vector, no outline.
  2. DONUT — lavender (#C4A7E7). Shape: a circle with a clearly visible HOLE in the center. Flat vector.
  3. MACARON — mint green (#A8E6CF). Shape: two flat ovals stacked (sandwich cookie). Flat vector.
  4. CROISSANT — warm gold (#FFD07B). Shape: crescent/moon curve. Flat vector.
  5. ICE CREAM — sky blue (#89CFF0). Shape: triangular cone bottom + round scoop on top. Flat vector.
  6. CHOCOLATE — cocoa brown (#A0725B). Shape: small square with 2x2 grid lines. Flat vector.

- Colors must be BRIGHT PASTEL — not dark, not muddy, not gray. Each tile must be clearly distinguishable by both color AND shape.
- Randomly distribute all 6 types across the 64 cells. No type should dominate.
- Show 2 tiles with a subtle white glow (selected state, as if being swapped)
- Show 3 tiles with a frosted/icy glass overlay (ice obstacle)

BOTTOM BAR (below board):
- Three circular white buttons in a row:
  - Spatula/whisk icon with small red "5" badge
  - Mixer/blender icon with small red "3" badge
  - Pause icon (two vertical bars) — slightly smaller, rightmost

Background: warm cream (#FFF8F0) visible in areas above HUD and below bottom bar.

IMPORTANT: The 8x8 board must fill the center area properly. 64 tiles must all be visible. Tiles must be colorful pastels, NOT dark/muddy colors.

=== SCREEN B: RECIPE BOOK ===

This screen had two problems: dessert images were realistic photos, and a bottom navigation bar appeared. Fix both.

Layout:
- Top bar: Back arrow (left), "Recipes" title bold center, settings gear icon (right)
- Category tabs below title: "French" (active — dark red filled pill), "Japanese" (locked, beige pill with lock icon), "Korean" (locked, beige pill with lock icon)
- Mastery Progress card: white rounded card showing "Mastery Progress" label + "20%" + progress bar (dark red fill) + star icon
- Main content: 2-column grid of recipe cards on warm cream background

  Row 1:
  - Card 1: FLAT VECTOR illustration of a croissant (simple gold crescent shape, same style as game tile but larger and more detailed). "Croissant" label. Green checkmark. "3/3" with full progress bar. White card with subtle shadow.
  - Card 2: FLAT VECTOR illustration of an éclair (simple elongated brown oval with cream line on top). "Éclair" label. "2/3" with partial progress bar.

  Row 2:
  - Card 3: FLAT VECTOR illustration of a crème brûlée (simple round ramekin shape, brown top with golden caramel). "Crème Brûlée" label. "1/3" with small progress bar.
  - Card 4: Locked — light beige card with dashed border, lock icon, "?" text.

  Row 3:
  - Card 5: Locked card
  - Card 6: Locked card

CRITICAL: All dessert illustrations in recipe cards MUST be flat vector illustrations — simple shapes, soft gradients, same art style as the game tiles. NO photographs. NO realistic food images. Think of them as larger, more detailed versions of the in-game tile icons.

NO bottom navigation bar. No tabs at bottom. Only the back arrow for navigation.

=== SCREEN C: SETTINGS ===

This screen had one problem: the top decorative image was a realistic photo of macarons. Fix it.

Layout:
- Top bar: Back arrow (left), "Settings" title bold center, settings gear icon (right)
- Decorative area: A small FLAT VECTOR illustration of stacked macarons (mint green, pink, gold — pastel colors, simple round shapes, same flat style as game). Centered, not too large.
- White rounded settings card containing:
  - Music: pink circle with flat music note icon + "Music" label + dark red toggle (ON)
  - Sound: gray circle with flat speaker icon + "Sound" label + dark red toggle (ON)
  - Vibration: pink circle with flat vibration icon + "Vibration" label + gray toggle (OFF)
  - Divider line
  - Language: "Language" label + "English" beige dropdown with chevron
  - Divider line
  - "Restore Purchases" dark red text link with arrow
  - "Privacy Policy" dark red text link with external link icon
- Bottom: small decorative flat cookie/pastry icons + "V1.0.0 — FRESHLY BAKED" in small gray text

CRITICAL: The decorative macaron image at the top MUST be a flat vector illustration, NOT a photograph. Simple pastel colored circles stacked.

NO bottom navigation bar.
```

---

*V3 변경사항: 게임플레이 보드 8x8 강조, 타일 밝은 파스텔 강조, 레시피북 디저트 플랫 일러스트 강조, 설정 상단 이미지 플랫화, 내비바 제거 재강조*
