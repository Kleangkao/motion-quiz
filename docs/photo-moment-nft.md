# Photo Moment NFT (Phase D MVP)

Mint a **Photo Moment** (not the result card) as a standalone Solana NFT using wallet-signed transactions and public Supabase Storage metadata.

## Architecture

- **NFT standard:** Classic SPL token mint (supply 1, decimals 0) + Metaplex Token Metadata v3 (`createCreateMetadataAccountV3Instruction`).
- **Why not Metaplex Core:** Browser wallet flow already uses `@solana/web3.js` `Transaction` + `WalletProvider.sendTransaction`. Token Metadata v2 instructions integrate cleanly without Umi wallet adapters.
- **Cluster:** Driven by `VITE_SOLANA_CLUSTER` (`devnet` | `mainnet-beta`) and `VITE_SOLANA_RPC_URL`.
- **Storage:** Supabase Storage bucket `motion-quiz-nft-assets` with cluster-prefixed paths:
  - `<cluster>/<packId>/<wallet>/<sessionId>/photo-<n>.png`
  - `<cluster>/<packId>/<wallet>/<sessionId>/photo-<n>.json`
- **Not permanent decentralized storage:** Supabase is a demo/hosted layer. Swap `nftStorage.ts` later for Arweave/Irys/IPFS without changing the ResultPage panel API.

## Env vars (frontend-safe)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SOLANA_CLUSTER=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_NFT_MINTING_ENABLED=true
VITE_APP_URL=https://motion-quiz.vercel.app
```

- Never put the Supabase **service role** key in the frontend.
- Set `VITE_NFT_MINTING_ENABLED=false` to hide minting without removing code.

## Manual Supabase setup

1. Apply migration `supabase/migrations/20250618120000_motion_quiz_nft_assets.sql` in the Supabase SQL editor or CLI.
2. Confirm bucket `motion-quiz-nft-assets` exists and is **public read**.
3. Confirm insert policy allows `devnet/` and `mainnet-beta/` path prefixes only.

### Mainnet tightening (before production)

- Prefer uploads via a Supabase Edge Function with validation (wallet/session ownership).
- Rate-limit uploads per wallet/session.
- Consider moving metadata/image to Arweave/Irys and storing only the URI on-chain.

## User flow

1. Play quiz and capture Photo Moments.
2. On ResultPage, **Record Score on Solana** (required for MVP mint).
3. Open **Photo Moment NFT** panel, pick a photo if multiple exist.
4. Click **Mint Photo Moment NFT** → uploads image + JSON → wallet signs mint tx.
5. Explorer link points to the **mint address** (SPL mint account). Metadata JSON includes the public image URL.

## Devnet test plan

1. Devnet wallet with SOL.
2. Supabase bucket/policy applied.
3. Record score on devnet.
4. Mint one Photo Moment.
5. Verify Explorer (devnet cluster), metadata JSON, and image URL.

## Mainnet-beta migration plan

1. Set `VITE_SOLANA_CLUSTER=mainnet-beta` and a mainnet RPC URL.
2. Deploy with tightened storage upload policy or Edge Function.
3. Fund wallets with mainnet SOL.
4. UI labels automatically use mainnet copy (no hardcoded “devnet” in NFT panel).
5. Local mint records are keyed by cluster and do not collide with devnet entries.

## Score receipt linkage

NFT metadata includes `score_receipt_tx` when a verified local recorded score exists. Mint is blocked if:

- Score is not recorded.
- Recorded score cluster ≠ configured cluster.
