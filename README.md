# GTO Trainer

A personal poker strategy simulator/tester built around **Poker Strategy Rulebook v1.0**.

The system purposely deals training situations rather than relying on random poker hands. It grades the decision, not the result of the cards, and explains the first meaningful mistake after the hand.

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
- Separate Cloudflare Pages frontend and Cloudflare Worker API
- No database required for v1.0; progress stays in browser `localStorage`

## Architecture

```text
GitHub: justing0406/GTO-trainer
│
├── web/                 Cloudflare Pages
│   ├── index.html       Poker table UI
│   ├── app.js           Game client + progress tracking
│   ├── styles.css       Responsive UI
│   ├── config.js        Optional Worker URL override
│   └── _headers         Browser security headers
│
├── worker/              Cloudflare Worker
│   ├── src/rules.js     Rulebook, ranges, glossary, math
│   ├── src/scenarios.js Scenario generation + grading
│   ├── src/index.js     HTTP API
│   ├── tests/           Node tests
│   └── wrangler.jsonc   Worker deployment config
│
└── docs/RULEBOOK_V1.md  Human-readable strategy specification
```

The Worker is deliberately authoritative for scenario construction and grading. The browser receives the visible hand state and action choices, but not opponent cards or the answer key. Opponent cards are returned only after grading.

## Cloudflare deployment

This repository is meant to be connected to **two Cloudflare projects from the same `main` branch**.

### 1. Deploy the Worker

In Cloudflare:

1. Go to **Workers & Pages**.
2. Create/import a Worker from GitHub.
3. Select `justing0406/GTO-trainer`.
4. Production branch: `main`.
5. Root directory: `worker`.
6. Worker name: **`gto-trainer-api`**. The Cloudflare project name must match the `name` in `worker/wrangler.jsonc`.
7. Build command: `npm test` (recommended).
8. Deploy command: `npx wrangler deploy`.
9. Deploy.

Copy the resulting Worker origin, for example:

```text
https://gto-trainer-api.<your-workers-subdomain>.workers.dev
```

The API exposes:

```text
GET  /api/health
GET  /api/meta
GET  /api/rules
GET  /api/scenario?mode=hand|drill&focus=...&seed=...
POST /api/grade
```

### 2. Deploy Pages

Create a separate **Cloudflare Pages** project from the same GitHub repository:

1. Production branch: `main`.
2. Root directory: `web`.
3. Framework preset: None.
4. Build command: leave blank (or use `exit 0`).
5. Build output directory: `.`
6. Deploy.

The `web` directory is intentionally dependency-free, so Pages can publish it directly.

### 3. Connect Pages to the Worker

After both are deployed, open the Pages site and go to **Settings** inside GTO Trainer. Paste the Worker URL and click **Save & test**.

That URL is stored only in your browser. If you prefer to bake it into the site, edit:

```js
// web/config.js
window.GTO_CONFIG = {
  apiBaseUrl: 'https://gto-trainer-api.<your-subdomain>.workers.dev'
};
```

and push the change to `main`.

You can also configure it quickly with a one-time query string:

```text
https://<your-pages-site>.pages.dev/?api=https://gto-trainer-api.<your-subdomain>.workers.dev
```

The app saves that Worker URL locally and removes the need to rebuild Pages.

### 4. Optional CORS hardening

`worker/wrangler.jsonc` initially uses:

```json
"ALLOWED_ORIGIN": "*"
```

That makes first deployment painless. Once your Pages production URL is stable, replace `*` with the exact Pages/custom-domain origin and redeploy the Worker.

## Local development

### Worker

```bash
cd worker
npm install
npm test
npm run dev
```

Wrangler normally runs at `http://localhost:8787`.

### Pages frontend

Serve `web/` with any static server. For example:

```bash
python3 -m http.server 8080 --directory web
```

When the frontend is opened on localhost it automatically tries `http://localhost:8787` for the Worker.

## Training behavior

### Training Hands

Scripted hands can contain multiple decisions. Feedback is withheld until the hand ends, matching the goal of reviewing the hand afterward. If you deviate from the intended teaching line but do not fold, later streets continue along the scripted training line so the trainer can still test later concepts.

### Decision Drills

Rapid single-decision scenarios are generated deterministically from the rule engine. Preflop drills draw from all 169 starting-hand classes, allowing the trainer to cover far more situations than a small static question bank.

### Results-oriented play is prohibited

Hidden opponent cards never affect the grade. A correct fold stays correct even when the opponent happened to be bluffing; a bad call stays bad even if it happened to win.

## Version 1.0 scope

This is intentionally a simplified, deterministic GTO-inspired strategy rather than a solver-frequency clone. Bluff 3-bets, bluff 4-bets, advanced blockers, exact mixed frequencies, advanced river bluff selection, overbets, deep stacks, short stacks, tournament ICM, and rake adjustments are reserved for future versions.

See [`docs/RULEBOOK_V1.md`](docs/RULEBOOK_V1.md) for the exact strategy implemented by the engine.
