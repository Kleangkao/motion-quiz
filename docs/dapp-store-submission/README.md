# Motion Quiz — Solana dApp Store submission package

This folder holds **non-sensitive** drafts and checklists for preparing a Solana dApp Store submission. Nothing here is submitted automatically.

## Status (as of release-readiness commit `3771613`)

| Item | Status |
|------|--------|
| Web/PWA production | Live at [motion-quiz.vercel.app](https://motion-quiz.vercel.app) |
| Android TWA package | `com.islanddao.motionquiz` |
| Release APK | Built locally (`twa/app/build/outputs/apk/release/app-release.apk`, not committed) |
| Digital Asset Links | Release fingerprint on production |
| Production cluster | **Devnet** (code supports mainnet; env not switched) |
| Real device camera/wallet QA | **Not done yet** |
| dApp Store submission | **Not submitted** |

## Files in this folder

| File | Purpose |
|------|---------|
| [metadata-draft.md](./metadata-draft.md) | Store listing copy and draft fields |
| [reviewer-test-instructions.md](./reviewer-test-instructions.md) | How reviewers/testers should exercise the app |
| [mainnet-release-checklist.md](./mainnet-release-checklist.md) | Steps before switching production to mainnet |
| [assets-checklist.md](./assets-checklist.md) | Required submission assets and account items |
| [known-limitations.md](./known-limitations.md) | Honest limits (emulator, devnet, pending QA) |

## Privacy policy

Served at: **https://motion-quiz.vercel.app/privacy.html** (after deploy)

Source: `public/privacy.html`

## What is intentionally **not** in git

- Release keystore and `twa/signing.properties`
- Signed APK / AAB binaries
- Screenshot captures with wallet addresses or personal data
- Publisher wallet keys, KYC documents, or submission receipts

## Next step for the owner

1. Review and finalize metadata + privacy contact placeholders.
2. Complete real Android/Seeker QA (camera + wallet).
3. Decide devnet vs mainnet for store review (see mainnet checklist).
4. Capture final phone screenshots on a real device.
5. Submit only after explicit approval.
