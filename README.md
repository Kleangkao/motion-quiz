# Motion Quiz

A **mobile-first, camera-based gesture quiz** for the Solana Mobile / Seeker ecosystem. Players answer by pointing **left or right** — no tapping required. Built as a PWA for workshops, community events, and mobile learning sessions.

## What it does

- **Solo Play** — built-in quiz packs (including Solana Mobile / Seeker basics)
- **Challenge Mode** — import host-shared JSON packs locally (no backend, no live rooms)
- **Host Mode** — create, edit, and export challenge quiz packs
- **Gesture gameplay** — MediaPipe pose + hand detection, calibration, hold-to-lock
- **Wallet (optional)** — Mobile Wallet Adapter + browser wallet fallback
- **Signed score proof** — off-chain message signature after a run (no gas, no transfers)

## What is intentionally excluded (MVP)

- No live multiplayer / Kahoot-style sync
- No backend, global leaderboard, or on-chain score storage
- No token rewards, NFT minting, or SGT verification
- No camera upload or personal data collection

## Quick start

```bash
npm install --legacy-peer-deps
npm run dev
```

Open `http://localhost:5173` — use Chrome DevTools mobile emulation or an Android device for the best experience.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Home — mode selection |
| `/solo` | Solo quiz pack picker |
| `/challenge` | Import / play challenges |
| `/challenge/host` | Host dashboard |
| `/play/:quizId/calibrate` | Camera calibration |
| `/play/:quizId/gesture-test` | Gesture test |
| `/play/:quizId/game` | Gameplay |
| `/play/:quizId/result/:sessionId` | Results + optional wallet proof |
| `/results` | Local result history |
| `/settings` | Camera & gesture settings |

Legacy `/play` and `/teacher` redirect to the new routes.

## Solana / Mobile Wallet Adapter

MWA is registered on client mount via `@solana-mobile/wallet-standard-mobile` with app identity:

- **Name:** Motion Quiz
- **URI:** current origin (or production URL when deployed)
- **Icon:** `/icon.svg`

Wallet connection is **optional** for gameplay. After finishing, players can sign a clear message:

> I played Motion Quiz. Challenge: … Score: … Accuracy: … Timestamp: … This signature does not move funds.

Proofs are stored locally in IndexedDB with the result.

**Desktop dev:** Phantom (or any Wallet Standard Solana wallet) is used as a fallback when MWA is unavailable.

**Agent / developer guardrails:** Before changing wallet, signing, or Solana-related quiz content, read [`.agents/skills/solana-dev/SKILL.md`](.agents/skills/solana-dev/SKILL.md).

## Privacy

- Camera frames are processed **on-device only** for gesture detection
- Video is **not uploaded** or stored (unless the optional local photo mini-game is enabled in Settings)
- **Game Moment** (optional on the result screen) generates a composed result card image in the browser — local preview and save/share only; no upload; v1 does not use the camera
- No accounts, no analytics backend in MVP

## PWA / APK / dApp Store path

1. `npm run build` — static assets in `dist/`
2. Deploy as HTTPS PWA (manifest at `/manifest.webmanifest`)
3. Wrap with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) or TWA for Android APK
4. Submit to the **Solana dApp Store** with metadata describing a mobile learning / community quiz game

## Tech stack

React · Vite · TypeScript · Tailwind CSS · Dexie (IndexedDB) · MediaPipe Pose/Hand · Solana MWA · Wallet Standard

## Scripts

```bash
npm run dev      # development server
npm run build    # typecheck + production build
npm test -- --run
npm run lint
```

## Built-in quiz packs

| ID | Title | Mode |
|----|-------|------|
| `solana-basics` | Solana Basics | Solo (12 questions) |
| `islanddao-challenge` | IslandDAO Challenge | Challenge (10 questions) |
| `seeker_mobile_basics` | Solana Mobile & Seeker Basics | Solo (8 questions) |
| `starter_places_at_school` | Places at School | Solo (legacy demo) |

Built-in packs are added **idempotently by ID** on app load: missing packs are inserted, and existing local lessons (including user edits) are never overwritten.

## Game Moment (optional)

After a quiz, the **Result** screen offers an optional **Game Moment** — a composed result card (score, accuracy, pack name, date, wallet/proof badge if present). It is generated **locally in the browser** with canvas; you choose when to create, preview, and save/share. Nothing is uploaded automatically. v1 is a stats card only (no camera selfie); snapshot/selfie support may come later.

---

**Motion Quiz** — gesture quiz for Solana Mobile workshops. Play with your camera, prove your score with your wallet, keep everything local.
