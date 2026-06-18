# Known limitations — Motion Quiz (pre-submission)

Honest constraints as of the release-readiness path. **These are not app defects unless reproduced on real hardware.**

---

## Emulator QA (`alice_daily_api35` and similar AVDs)

| Area | Emulator | Real device needed |
|------|----------|-------------------|
| UI / navigation / layout | Testable | Recommended |
| TWA fullscreen / asset links | Testable (release APK) | Confirm on device |
| Camera / gesture detection | **Not reliably testable** | **Yes** |
| Wallet connect / sign | **Not testable** (no MWA wallet) | **Yes** |
| Record score / NFT mint | **Not testable** | **Yes** |

**Why:** AVD had `hw.camera.front = none`, only emulated back camera, and no Phantom/Solflare/Seed Vault/MWA wallet installed. Browser extension wallets are unavailable inside TWA.

---

## Production environment

- Code supports **devnet** and **mainnet-beta**; **production Vercel/Supabase remain on devnet** until the mainnet checklist is completed.
- Store copy must not claim mainnet is live until env switch and mainnet QA are done.

---

## Seeker / hardware

- Seeker-specific hardware and Seed Vault flows are **not yet validated** on physical Seeker hardware.
- Final dApp Store readiness requires real Android/Seeker device testing.

---

## Scope boundaries

- Motion Quiz records score proofs via memo transactions; it does not custody user funds.
- NFT minting is optional and env-gated (`VITE_NFT_MINTING_ENABLED`).
- Gesture detection quality depends on lighting, camera, and calibration — not guaranteed on all devices.

---

## Not blockers for preparing submission materials

- Missing final screenshots (need real device).
- Mainnet not switched (document clearly in listing if submitting on devnet for review).
