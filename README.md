# Sweet Crunch - Dessert Match-3 Puzzle Game

A dessert-themed match-3 puzzle game with a data-driven 500-level system, 5 special gems, 3 obstacle types, and an artisanal patisserie design system. Built with Phaser 3 + TypeScript, deployed to Web and Android.

## Game Features

- **8x8 Grid, 6 Tile Types** — Cupcake, Donut, Macaron, Croissant, Icecream, Chocolate
- **5 Special Gems** — Line Blast (4-match), Color Bomb (5-match), Bomb, Cross Blast, Wrapped (L/T-shape)
- **3 Obstacle Types** — Ice (multi-layer), Chain (swap lock), Stone (cell block)
- **500 Data-Driven Levels** — Band → Pod → Template → Factory pipeline with selective overrides
- **Cascade Combo System** — Match → gravity → refill → re-match async loop with score multipliers
- **Move-Limited Gameplay** — Strategic puzzle solving, not reflex-based

## Architecture

```
src/ (21 scripts, 11,268 lines)
├── main.ts                  # Entry point
├── config.ts                # Game constants, grid settings, color tokens
├── scenes/
│   ├── BootScene.ts         # Asset loading & preload
│   ├── TitleScene.ts        # Main menu
│   ├── LevelSelectScene.ts  # Level selection UI
│   ├── GameScene.ts         # Core gameplay (6,304 lines)
│   └── SettingsScene.ts     # User preferences
├── data/
│   ├── levels.ts            # Level registry
│   ├── levelBands.ts        # Difficulty bands
│   ├── levelPods.ts         # Sub-groups within bands
│   ├── levelTemplates.ts    # Generation rules
│   ├── levelFactories.ts    # Programmatic level production
│   ├── levelOverrides.ts    # Selective adjustments
│   ├── tutorials.ts         # Tutorial sequences
│   ├── progress.ts          # Save/load progress
│   └── activeRun.ts         # Current session state
├── utils/
│   ├── SoundManager.ts      # Audio (BGM + SFX)
│   ├── AdMobManager.ts      # Monetization (Banner + Rewarded)
│   ├── UserSettings.ts      # Persistent user preferences
│   └── SceneTransition.ts   # Scene transition effects
└── shaders/
    └── RainbowPipeline.ts   # WebGL shader effects
```

## Level System

500 levels are generated through a multi-layer data architecture:

| Layer | File | Role |
|-------|------|------|
| Band | `levelBands.ts` | Difficulty ranges (e.g., Easy, Normal, Hard) |
| Pod | `levelPods.ts` | Sub-groups within each band |
| Template | `levelTemplates.ts` | Generation rules (goals, obstacles, moves) |
| Factory | `levelFactories.ts` | Programmatic level production |
| Override | `levelOverrides.ts` | Hand-tuned adjustments for specific levels |

## Design System: "The Artisanal Patisserie"

An editorial approach to cozy gaming — boutique bakery aesthetics instead of chaotic match-3 neon.

- **Material-style Color Tokens** — 20+ named tokens (Surface, Primary, Secondary, Tertiary)
- **"No-Line" Rule** — No 1px borders; tonal shifts and soft gradients only
- **Glassmorphism Overlays** — 80% opacity + backdrop blur for immersive UI layers
- **Plus Jakarta Sans Typography** — 5-level type hierarchy (Display → Label)

## Tech Stack

| Category | Technology |
|----------|------------|
| Game Engine | Phaser 3 (v3.90+) |
| Language | TypeScript (strict mode) |
| Build Tool | Vite |
| Mobile | Capacitor (Android) |
| Monetization | AdMob (Banner + Rewarded) |
| Shader | WebGL Custom Pipeline |
| Deployment | GitHub Pages (Web) · Google Play (Android) |
| AI Partner | Claude Code (Vibe Coding) |

## Getting Started

```bash
# Install dependencies
npm install

# Development server (localhost:3000)
npm run dev

# Production build
npm run build

# Android build
npm run cap:android
```

## Links

- [Web Demo](https://aile1492.github.io/sweet-crunch/)
- [Portfolio (Notion)](https://www.notion.so/34213eca65878176b367f96fc2f7ef0d)

## Contact

KIM MIN GWAN | mingwan1492@gmail.com
