# Design System: The Artisanal Patisserie

## 1. Overview & Creative North Star
**Creative North Star: "The Gourmet Confectioner"**
This design system moves away from the chaotic, high-contrast energy of traditional match-3 games. Instead, it adopts a high-end editorial approach to "cozy gaming." We are creating a digital experience that feels like a boutique bakery menu—sophisticated, breathable, and tactile. 

By leveraging **intentional asymmetry** (e.g., placing UI labels off-center or overlapping card edges) and a **tonal-first hierarchy**, we break the "template" feel. The layout shouldn't feel like a grid of buttons; it should feel like ingredients carefully arranged on a marble countertop. We prioritize "white space" (rendered here as warm cream space) to give the player's eyes a rest between intense gameplay sessions.

---

## 2. Colors & Surface Philosophy
The palette is a sophisticated blend of gourmand tones. We use Material-style tokens to ensure systematic application while maintaining an artisanal feel.

### The Color Palette
*   **Background (Base):** `#fcf5ed` (Surface) - Our warm, flour-dusted canvas.
*   **Primary (Action):** `#a83028` - A rich, baked cherry red for high-intent actions.
*   **Secondary (Accents):** `#924250` - A soft raspberry for supportive elements.
*   **Tertiary (Rewards):** `#775609` - A golden honey hue for coins and achievements.

### Named Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#fcf5ed` | Base canvas |
| `surface` | `#fcf5ed` | Main surface |
| `surface_container_low` | `#f7f0e7` | Subtle grouping |
| `surface_container` | `#eee7de` | Standard containers |
| `surface_container_high` | `#e9e1d8` | Elevated containers |
| `surface_container_highest` | `#e3dcd2` | Highest elevation |
| `surface_container_lowest` | `#ffffff` | Cards, tiles |
| `primary` | `#a83028` | Primary actions |
| `primary_container` | `#ff7668` | Primary gradient end |
| `on_primary` | `#ffefed` | Text on primary |
| `secondary` | `#924250` | Secondary actions |
| `secondary_container` | `#ffc2c9` | Secondary backgrounds |
| `tertiary` | `#775609` | Rewards, currency |
| `tertiary_container` | `#f9cb76` | Tertiary backgrounds |
| `on_surface` | `#312e29` | Primary text |
| `on_surface_variant` | `#5f5b55` | Secondary text |
| `outline` | `#7b7670` | Subtle outlines |
| `outline_variant` | `#b2aca5` | Ghost borders (20% opacity) |
| `error` | `#b31b25` | Error states |
| `error_container` | `#fb5151` | Error backgrounds |

### The "No-Line" Rule
**Strict Mandate:** Prohibit 1px solid borders for sectioning. 
In this system, boundaries are organic. We define areas using:
1.  **Tonal Shifts:** Placing a `surface-container-low` (#f7f0e7) area against the main `surface` (#fcf5ed).
2.  **Soft Gradients:** Use a subtle linear gradient from `primary` (#a83028) to `primary-container` (#ff7668) for hero buttons to give them a "baked" 3D volume without using outlines.

### Glass & Texture
For floating "Pause" menus or "Level Up" overlays, use **Glassmorphism**. Apply `surface-container-lowest` (#ffffff) at 80% opacity with a `20px` backdrop blur. This ensures the colorful game board "bleeds" through, maintaining the cozy, immersive atmosphere.

---

## 3. Typography
We utilize **Plus Jakarta Sans** (as a high-end alternative to Nunito that maintains the rounded, friendly geometry but offers better kerning for editorial layouts).

*   **Display (Lg/Md):** 3.5rem / 2.75rem. Used for "Sweet Crunch!" victory screens. Heavy weight, tight tracking.
*   **Headline (Sm):** 1.5rem. Used for "Level Goals" or "Shop Categories." This is the voice of the bakery.
*   **Title (Md):** 1.125rem. Used for item names (e.g., "Strawberry Tart").
*   **Body (Md):** 0.875rem. Used for descriptions. Always set in `on-surface-variant` (#5f5b55) to reduce eye strain.
*   **Label (Md):** 0.75rem. All-caps with 5% letter spacing for "Price" or "Timer" labels to add a touch of premium retail aesthetic.

---

## 4. Elevation & Depth
Traditional drop shadows are forbidden. We use **Tonal Layering** to create a "Tactile Paper" effect.

*   **The Layering Principle:** 
    *   **Level 0 (Floor):** `surface` (#fcf5ed)
    *   **Level 1 (Sections):** `surface-container-low` (#f7f0e7)
    *   **Level 2 (Cards):** `surface-container-lowest` (#ffffff)
*   **Ambient Shadows:** For floating elements that require a "lift" (like a moving game piece), use a large, diffused shadow: `box-shadow: 0 10px 30px rgba(74, 55, 40, 0.08)`. Note the use of a dark-brown tint rather than pure black.
*   **The Ghost Border:** If a button feels lost, use a 1.5px border of `outline-variant` (#b2aca5) at 20% opacity. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary (The "Signature Tart"):** Fully rounded (pill), `primary` to `primary-container` gradient. No shadow, but a subtle inner-glow at the top to mimic a convex surface.
*   **Secondary:** `surface-container-highest` background with `on-surface` text.
*   **Tertiary:** Text-only, using `secondary` color, bold weight.

### Cards & Popups
*   **Radius:** 40px (`xl` token) for all main containers.
*   **Separation:** Forbid dividers. Separate "Score" from "Moves" using a vertical gap of `2rem` (`lg` spacing) or a subtle shift from `surface-container` to `surface-bright`.

### The Game Board (Grid)
*   **The Tray:** The board itself should use `surface-variant` (#e3dcd2) with a `40px` radius. 
*   **The Tiles:** Pieces (Mint, Lavender, Pink) should have no outlines. Use soft radial gradients to give them a "mochi-like" soft-touch appearance.

### Progress Bars
*   **Track:** `surface-container-high` (#e9e1d8).
*   **Indicator:** `tertiary` (#775609) golden honey gradient.

---

## 6. Do's and Don'ts

### Do:
*   **Do** overlap elements. Let a "Cookie" illustration break the bounding box of a card to create depth.
*   **Do** use asymmetrical margins. A 32px left margin and 24px right margin on a card title makes the UI feel hand-crafted.
*   **Do** use the `coral accent` (#FF6F61) exclusively for "Limited Time Offers" or "Danger" states (like low moves).

### Don't:
*   **Don't** use pure black (#000000). Use `on-background` (#312e29) for all "dark" elements.
*   **Don't** use 90-degree corners. Everything must feel "kneaded" and soft.
*   **Don't** use standard "shimmer" effects for loading. Use a soft "pulse" of the `surface-tint` to mimic rising dough.

---

## 7. Spacing Scale
Stick to a strict 8px-based system to maintain professional rhythm:
*   **sm:** 0.5rem (8px) - Internal element padding.
*   **DEFAULT:** 1rem (16px) - Standard gutter.
*   **lg:** 2rem (32px) - Content block separation.
*   **xl:** 3rem (48px) - Hero section breathing room.

---

## 8. Phaser 3 Color Mapping
For use in config.ts and Scene files:

| Design Token | CSS Hex | Phaser Hex |
|-------------|---------|------------|
| background | `#fcf5ed` | `0xfcf5ed` |
| surface | `#fcf5ed` | `0xfcf5ed` |
| surface_container_low | `#f7f0e7` | `0xf7f0e7` |
| surface_container | `#eee7de` | `0xeee7de` |
| surface_container_high | `#e9e1d8` | `0xe9e1d8` |
| surface_container_highest | `#e3dcd2` | `0xe3dcd2` |
| surface_container_lowest | `#ffffff` | `0xffffff` |
| surface_variant | `#e3dcd2` | `0xe3dcd2` |
| primary | `#a83028` | `0xa83028` |
| primary_container | `#ff7668` | `0xff7668` |
| secondary | `#924250` | `0x924250` |
| tertiary | `#775609` | `0x775609` |
| tertiary_container | `#f9cb76` | `0xf9cb76` |
| on_surface | `#312e29` | `0x312e29` |
| on_surface_variant | `#5f5b55` | `0x5f5b55` |
| error | `#b31b25` | `0xb31b25` |
| outline_variant | `#b2aca5` | `0xb2aca5` |
