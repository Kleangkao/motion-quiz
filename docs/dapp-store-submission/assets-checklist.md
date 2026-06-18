# Submission assets checklist — Motion Quiz

Track what is ready vs still needed before dApp Store upload.

---

## Binary

| Asset | Status | Notes |
|-------|--------|-------|
| Signed release APK | Built locally | `twa/app/build/outputs/apk/release/app-release.apk` — **not in git** |
| Package name | Ready | `com.islanddao.motionquiz` |
| versionCode / versionName | Ready | `1` / `1.0.0` (bump before store if needed) |
| Digital Asset Links | Deployed | Production matches release cert |

---

## Visual assets

| Asset | Status | Notes |
|-------|--------|-------|
| App icon (512 PNG) | In repo | `public/icon-512.png`, maskable variant |
| Adaptive / launcher icon | In TWA | From Bubblewrap / mipmap |
| Phone screenshots (6–8 typical) | **Missing — real device** | Capture on Android/Seeker; avoid wallet addresses in frame |
| Feature graphic / banner | **TBD** | Per portal requirements |
| Promo video | Optional | Not prepared |

Reference-only emulator captures (if taken) live in `_screenshots-temp/` — **gitignored**, not for submission.

---

## Text and URLs

| Field | Status | Location |
|-------|--------|----------|
| App name | Draft | `metadata-draft.md` |
| Short description | Draft | `metadata-draft.md` |
| Full description | Draft | `metadata-draft.md` |
| Release notes | Draft | `metadata-draft.md` |
| Reviewer notes | Draft | `metadata-draft.md`, `reviewer-test-instructions.md` |
| Website | Ready | https://motion-quiz.vercel.app |
| Privacy policy URL | Ready after deploy | https://motion-quiz.vercel.app/privacy.html |
| Support email | Ready | jamesbitarcade@gmail.com |
| Category | Draft | Games / Education |

---

## Account and publisher

| Item | Status |
|------|--------|
| Solana Mobile publisher account | **Owner action** |
| Publisher wallet | **Owner action** |
| KYC/KYB | **Owner action** |
| Submission / upload SOL costs | **Owner action** |
| Storage provider selection (portal) | **Owner action** |

---

## Pre-submission verification

- [ ] Real-device camera + wallet QA complete
- [ ] Cluster (devnet vs mainnet) decided and env matches copy
- [x] Privacy policy contact filled in
- [ ] No secrets in APK metadata or screenshots
- [ ] Owner explicitly approves submit
