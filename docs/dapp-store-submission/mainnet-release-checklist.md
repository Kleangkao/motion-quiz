# Mainnet release checklist — Motion Quiz

Use before switching **production** to mainnet and before claiming mainnet in store listing. **Do not run mainnet steps until explicitly approved.**

---

## Signing and Android

- [ ] Back up release keystore and passwords (stored outside repo).
- [ ] Confirm production `/.well-known/assetlinks.json` matches **release** certificate SHA-256.
- [ ] Rebuild signed release APK after any final changes: `cd twa && gradlew.bat assembleRelease`
- [ ] Install final APK on **real** Android/Seeker and confirm verified TWA (no URL bar).

---

## Vercel (frontend)

- [ ] `VITE_SOLANA_CLUSTER=mainnet-beta`
- [ ] `VITE_SOLANA_RPC_URL` — reliable mainnet RPC (not public default if rate-limited in prod)
- [ ] `VITE_NFT_MINTING_ENABLED` — set intentionally (`true` / `false`)
- [ ] `VITE_APP_URL=https://motion-quiz.vercel.app`
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` unchanged unless project changes
- [ ] Deploy and smoke-test Home, Play, Result, Scores in browser

---

## Supabase (backend)

- [ ] Edge Function secret: `MOTION_QUIZ_CLUSTER=mainnet-beta`
- [ ] Edge Function secret: `SOLANA_RPC_URL` — mainnet RPC
- [ ] Deploy updated `verify-score` function (cluster validation supports mainnet-beta in source)
- [ ] Confirm DB policies/migrations allow `mainnet-beta` cluster rows (already in schema)
- [ ] Confirm NFT storage paths/policies for `mainnet-beta/` if minting enabled

---

## On-chain QA (small amounts, user approval)

- [ ] Record one score on mainnet with test wallet (small SOL for fees only)
- [ ] Verify memo content and leaderboard row
- [ ] Verify explorer links use mainnet (no devnet query param)
- [ ] NFT mint on mainnet **only if** minting enabled and user approves cost/risk

---

## Real device QA

- [ ] Front camera calibration and in-game gestures
- [ ] MWA / Seeker wallet connect and sign
- [ ] Full flow: quiz → result → record score → scores/leaderboard
- [ ] Photo Moment NFT path if enabled

---

## Store submission (after above)

- [ ] Update store metadata to state mainnet (if applicable)
- [ ] Final screenshots from real device
- [x] Privacy policy contact info finalized (jamesbitarcade@gmail.com)
- [ ] Publisher wallet funded for submission/upload costs
- [ ] KYC/KYB complete in publisher portal
- [ ] **Submit only after owner approval**

---

## Rollback plan

- Keep devnet env values documented to revert Vercel/Supabase secrets if mainnet QA fails.
- Previous release APK remains valid if package/signing unchanged.
