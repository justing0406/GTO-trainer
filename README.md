# GTO Trainer

A personal poker strategy simulator/tester built around **Poker Strategy Rulebook v1.0**.

The trainer purposely deals situations rather than relying on random poker hands. It grades the decision, not the result of the cards, and explains the first meaningful mistake after the hand.

## What is included

- 6-max, 100-BB No-Limit Hold'em Version 1.0 rules
- Exact opening-range drills for UTG, HJ, CO, BTN, and SB
- Facing-open, Big Blind defense, facing-3-bet, limper, squeeze, and pot-odds drills
- Scripted multi-street hands covering dry/wet boards, continuation betting, strong draws, turn shutdowns, turn barrels, river value, river fold discipline, multiway pots, and opponent exploits
- Four-level grading: Perfect, Correct, Minor Mistake, Major Mistake
- First-mistake identification
- Hidden opponent cards until grading
- Rulebook and beginner-friendly poker glossary
- Local progress dashboard with category scores, streaks, and recent mistakes
- Adaptive **Weakest area** focus option
- No database required for v1.0; progress stays in browser `localStorage`

## Architecture

The entire application deploys as **one Cloudflare Worker named `gto-trainer`**.

```text
GitHub: justing0406/GTO-trainer
│
├── web/                    Static assets served by the Worker
│   ├── index.html          Poker table UI
│   ├── app.js              Game client + progress tracking
│   ├── styles.css          Responsive UI
│   └── config.js           Automatically uses the current origin
│
├── worker/
│   ├── src/rules.js        Rulebook, ranges, glossary, math
│   ├── src/scenarios.js    Scenario generation + grading
│   ├── src/index.js        /api/* Worker routes
│   ├── tests/              Node tests
│   ├── package.json
│   └── wrangler.jsonc      Worker + Static Assets deployment config
│
└── docs/RULEBOOK_V1.md     Human-readable strategy specification
```

Cloudflare Workers Static Assets serves the files in `web/`, while `/api/*` requests run through the Worker code. The frontend therefore calls the API on the **same origin**. There is no Worker URL to paste and no separate Pages project.

The Worker remains authoritative for scenario construction and grading. The browser receives the visible hand state and action choices, but not opponent cards or the answer key. Opponent cards are returned only after grading.

## Cloudflare deployment

Connect the existing **`gto-trainer` Worker** to this GitHub repository and `main` branch.

Recommended build settings:

```text
Production branch: main
Root directory: worker
Build command: npm test
Deploy command: npx wrangler deploy
```

`worker/wrangler.jsonc` already sets:

```text
Worker name: gto-trainer
Static assets: ../web
API routes: /api/*
```

After deployment, open the Worker's normal site URL, for example:

```text
https://gto-trainer.<your-workers-subdomain>.workers.dev
```

The poker trainer should load immediately and automatically deal the first hand. No app configuration is required.

The API is available on the same site:

```text
GET  /api/health
GET  /api/meta
GET  /api/rules
GET  /api/scenario?mode=hand|drill&focus=...&seed=...
POST /api/grade
```

## Local development

Run everything together through Wrangler:

```bash
cd worker
npm install
npm test
npm run dev
```

Then open the Wrangler URL, normally:

```text
http://localhost:8787
```

The same local origin serves both the poker interface and the API.

To validate the deploy bundle without publishing:

```bash
npm run check:deploy
```

## Training behavior

### Training Hands

Scripted hands can contain multiple decisions. Feedback is withheld until the hand ends. If you deviate from the intended teaching line but do not fold, later streets continue along the scripted training line so the trainer can still test later concepts.

### Decision Drills

Rapid single-decision scenarios are generated deterministically from the rule engine. Preflop drills draw from all 169 starting-hand classes, allowing the trainer to cover far more situations than a small static question bank.

### Results-oriented play is prohibited

Hidden opponent cards never affect the grade. A correct fold stays correct even when the opponent happened to be bluffing; a bad call stays bad even if it happened to win.

## Version 1.0 scope

This is intentionally a simplified, deterministic GTO-inspired strategy rather than a solver-frequency clone. Bluff 3-bets, bluff 4-bets, advanced blockers, exact mixed frequencies, advanced river bluff selection, overbets, deep stacks, short stacks, tournament ICM, and rake adjustments are reserved for future versions.

See [`docs/RULEBOOK_V1.md`](docs/RULEBOOK_V1.md) for the exact strategy implemented by the engine.
