# Reviewer test instructions — Motion Quiz

For Solana dApp Store reviewers and internal QA. **Do not submit these notes as credentials.**

---

## Requirements

| Requirement | Details |
|-------------|---------|
| Device | Android phone or **Seeker** with working **front camera** |
| Wallet | Solana Mobile–compatible / **MWA-capable** wallet (e.g. on Seeker: Seed Vault; on Android: install a supported wallet app) |
| Network | App loads from https://motion-quiz.vercel.app (TWA) or same URL in browser |
| Cluster | **Devnet** on current production unless mainnet env has been switched and verified |

**Emulator:** UI/navigation can be smoke-tested on an emulator, but an AVD **without front camera passthrough and without a wallet app cannot validate camera gestures or wallet signing.** Use a real device for final review.

---

## Install (Android TWA)

1. Install the signed release APK provided by the publisher (`com.islanddao.motionquiz`).
2. Open **Motion Quiz** from the launcher.
3. Confirm full-screen TWA (no Chrome address bar) when Digital Asset Links are verified.

---

## Test flow

### 1. Home and navigation

1. Home screen loads with topics (e.g. **Solana**, **IslandDAO Challenge**).
2. Open **Start Quiz**, **Scores**, and **Settings** — no crash.

### 2. Camera and gestures

1. Start a quiz (built-in topic recommended: **Solana**).
2. Grant **camera permission** when prompted.
3. Complete **Calibration** if shown.
4. During play, answer by gesturing **left** (SAFE/TRUE) or **right** (RISKY/FALSE).
5. Optional: open **Settings → Gesture Test** to verify detection in a controlled screen.

### 3. Complete quiz

1. Finish the quiz timer or all questions.
2. Open **Result** page — score and summary display.

### 4. Wallet and score recording

1. On Result (built-in topic), open **Solana Score** section.
2. Tap **Connect Wallet** and approve in the wallet app.
3. Tap **Record Score on Solana** and approve the **memo** transaction in the wallet.
4. Confirm success message and optional explorer link.

**Note:** Requires devnet SOL for fees on current production. No token transfer from the app.

### 5. Scores and leaderboard

1. Open **Scores** from Home.
2. View **My Scores** (if you recorded) and **Leaderboard** for the topic.
3. Confirm transaction links open the correct cluster explorer.

### 6. Photo Moment NFT (if enabled)

1. After a quiz with camera moments, on Result open **Photo Moment NFT** if shown.
2. Select a moment, connect wallet if needed, mint on devnet.
3. View mint status / explorer link when complete.

---

## What not to expect on emulator-only QA

- Reliable hand/pose gesture detection without front camera.
- Wallet connect, score record, or NFT mint without an installed MWA wallet.

---

## Reporting issues

Include: device model, Android version, wallet app name, cluster (devnet/mainnet), steps to reproduce, and whether TWA showed a URL bar.

Support contact: jamesbitarcade@gmail.com
