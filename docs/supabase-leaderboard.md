# Motion Quiz — Verified Leaderboard Backend (Phase A)

This document describes the Supabase + Solana foundation for **verified topic leaderboards**. Phase A adds schema, RLS, and a `verify-score` Edge Function. It does **not** add the frontend “Record Score on Solana” button yet.

## What it does

1. Player completes a built-in featured pack (IslandDAO, Solana Basics, Seeker).
2. In a later phase, the app will send a **Solana devnet transaction** with a compact JSON memo (`score_receipt` v1).
3. The `verify-score` Edge Function fetches the transaction from RPC, confirms the memo matches the expected payload, and inserts a row into `motion_quiz_scores`.
4. Leaderboards read from `motion_quiz_topic_leaderboard` (best score per wallet per pack version).

**Custom user topics are excluded** from the global leaderboard in v1 (`isLeaderboardEligiblePack`).

**Pack content versioning:** each row stores `pack_content_hash` so scores from different quiz versions do not mix unfairly when built-in packs change.

## Hackathon-demo caveat

Verification checks on-chain memo + transaction success + signer. **Client-reported score fields can still be manipulated** until server-issued nonce/session validation is added. Treat this as demo-grade integrity, not production anti-cheat.

## Security rules

| Secret | Where it belongs |
|--------|------------------|
| `VITE_SUPABASE_URL` | Frontend `.env.local` |
| `VITE_SUPABASE_ANON_KEY` | Frontend `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Edge Function secret only** — never in browser code |
| `SOLANA_RPC_URL` | Edge Function secret |

Copy `.env.example` to `.env.local` for local frontend work. **Do not commit `.env.local`.**

## Apply database migration

### Option A — Supabase CLI (recommended)

```bash
# Login once
supabase login

# Link project (ref: qpynjdcgpqeknjlmlmju)
supabase link --project-ref qpynjdcgpqeknjlmlmju

# Push migration to remote
supabase db push
```

### Option B — Supabase Dashboard

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste contents of `supabase/migrations/20250617120000_motion_quiz_leaderboard.sql`.
3. Run the script.

## Edge Function secrets

Set these in **Project Settings → Edge Functions → Secrets** (or via CLI):

```bash
supabase secrets set SUPABASE_URL="https://<project-ref>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
supabase secrets set SOLANA_RPC_URL="https://api.devnet.solana.com"
supabase secrets set MOTION_QUIZ_CLUSTER="devnet"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are often injected automatically in hosted Edge Functions; set them explicitly if local invokes fail.

**Never** put the service role key in `.env.example`, frontend env, or git.

## Deploy `verify-score`

```bash
supabase functions deploy verify-score --no-verify-jwt
```

`verify_jwt = false` is configured in `supabase/config.toml` because verification is based on Solana tx + memo, not Supabase JWT. Restrict abuse with rate limits / CAPTCHA in a later phase if needed.

## API contract (for future frontend)

**POST** `https://<project-ref>.supabase.co/functions/v1/verify-score`

Headers:

- `Content-Type: application/json`
- `apikey: <VITE_SUPABASE_ANON_KEY>` (public anon key)

Body:

```json
{
  "txSignature": "<solana-tx-signature>",
  "expected": {
    "cluster": "devnet",
    "walletAddress": "<signer-wallet>",
    "packId": "islanddao-challenge",
    "packTitle": "IslandDAO Challenge",
    "packContentHash": "<sha256-hex>",
    "sessionId": "<session-uuid>",
    "score": 4,
    "total": 5,
    "accuracy": 80,
    "durationMs": 42000,
    "resultHash": "<sha256-hex>"
  }
}
```

Response (success):

```json
{
  "ok": true,
  "score": { "...row..." },
  "txSignature": "...",
  "slot": 12345,
  "blockTime": "2025-06-17T12:00:00.000Z"
}
```

Duplicate `tx_signature` returns the existing row with `"duplicate": true`.

## Reading leaderboards

Query the view (anon key + RLS public read):

```sql
select *
from motion_quiz_topic_leaderboard
where cluster = 'devnet'
  and pack_id = 'islanddao-challenge'
  and pack_content_hash = '<current-pack-hash>'
order by accuracy desc, score desc, duration_ms asc nulls last;
```

From the frontend (later phase):

```typescript
const { data } = await supabase
  .from('motion_quiz_topic_leaderboard')
  .select('*')
  .eq('cluster', 'devnet')
  .eq('pack_id', packId)
  .eq('pack_content_hash', packContentHash)
  .order('accuracy', { ascending: false });
```

## Score receipt helpers (frontend)

Shared types and hash helpers:

- `supabase/functions/_shared/scoreReceipt.ts` (canonical)
- `src/solana/scoreReceipt.ts` (frontend wrappers)
- `src/solana/leaderboardEligibility.ts` (built-in pack filter)

Memo program ID: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`

## Devnet now, mainnet later

Phase A only accepts `cluster: "devnet"`. For production / dApp Store, switch:

- `MOTION_QUIZ_CLUSTER` / `VITE_SOLANA_CLUSTER` → `mainnet-beta`
- RPC URLs to mainnet
- Relax Edge Function cluster guard when ready

## Local testing without deploy

Pure helpers are covered by Vitest (`src/tests/scoreReceipt.test.ts`, etc.). Full Edge Function integration requires deployed secrets + a real devnet memo transaction (manual QA in a later phase).
