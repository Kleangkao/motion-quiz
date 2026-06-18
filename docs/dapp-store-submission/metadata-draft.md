# dApp Store metadata draft — Motion Quiz

**Draft only.** Review and replace placeholders before submission.

---

## App name

Motion Quiz

## Short description (draft)

A camera-gesture quiz game with Solana score proofs and Photo Moment NFTs.

## Full description (draft)

Motion Quiz is a mobile-first quiz game where you answer by moving or pointing left or right using your device camera.

**How it works**

- Choose a topic and start a quiz.
- The app uses the front camera to detect simple left/right gestures (SAFE/TRUE vs RISKY/FALSE).
- After a run, you can review your result and optionally record your score on Solana.
- Photo Moment NFTs let you mint selected in-game camera moments as NFTs when that feature is enabled.

**Solana integration**

- Score recording creates an on-chain memo transaction as a score proof (no token transfer from the app).
- Leaderboard and score history use Supabase; on-chain transactions are public.
- Wallet signing is handled by the user’s wallet app. Motion Quiz does not store or handle private keys.

**Platforms**

- Designed for browser-first play and Solana Mobile / Seeker via Trusted Web Activity (TWA).
- Android package: `com.islanddao.motionquiz`

**Current production note (honest)**

- Production is configured for **Solana devnet** today unless you switch Vercel/Supabase env to mainnet and complete final QA.
- Do not claim mainnet is live in store copy until that switch and testing are complete.

---

## Category suggestion

Games / Education (pick the closest fit in the publisher portal)

## Website URL

https://motion-quiz.vercel.app

## Support email

jamesbitarcade@gmail.com

## Privacy policy URL

https://motion-quiz.vercel.app/privacy.html

## Release notes (draft — v1.0.0)

- Initial public release.
- Camera-gesture quiz gameplay with built-in Solana and IslandDAO topics.
- Solana score recording and leaderboard (cluster depends on deployed env).
- Photo Moment NFT minting when enabled.
- Android TWA for fullscreen mobile play.

## Reviewer notes (draft)

- **Device:** Android phone or Seeker with a **front camera** and a **Solana Mobile–compatible wallet** (MWA-capable).
- **Emulator limitation:** Standard emulators without front camera passthrough and without a wallet app cannot fully test gestures or wallet flows.
- **Cluster:** Production currently uses **devnet** for score/NFT testing unless mainnet env is enabled (see `mainnet-release-checklist.md`).
- **No test seed phrases** are provided. Reviewers should use their own devnet wallet with a small SOL balance for memo transactions.
- **Permissions:** Camera (gameplay and Photo Moments), network (PWA and Supabase).
- **Package:** `com.islanddao.motionquiz`
- **TWA:** Verified via Digital Asset Links on production domain.

## Known limitations (summary)

See [known-limitations.md](./known-limitations.md).

- Real-device camera and wallet QA pending.
- Mainnet not enabled in production env at time of this draft.
- Emulator cannot validate gesture detection or wallet signing end-to-end.
