-- Motion Quiz verified leaderboard foundation (Phase A)
-- Public read via RLS; inserts only through verify-score Edge Function (service role).

create table if not exists public.motion_quiz_scores (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  wallet_short text not null,
  cluster text not null,
  pack_id text not null,
  pack_title text not null,
  pack_content_hash text not null,
  score integer not null,
  total integer not null,
  accuracy numeric(5, 2) not null,
  duration_ms integer,
  session_id text not null,
  result_hash text not null,
  tx_signature text not null,
  slot bigint,
  block_time timestamptz,
  memo_payload jsonb not null,
  created_at timestamptz not null default now(),

  constraint motion_quiz_scores_cluster_tx_unique unique (cluster, tx_signature),
  constraint motion_quiz_scores_score_nonneg check (score >= 0),
  constraint motion_quiz_scores_total_positive check (total > 0),
  constraint motion_quiz_scores_score_lte_total check (score <= total),
  constraint motion_quiz_scores_accuracy_range check (accuracy >= 0 and accuracy <= 100),
  constraint motion_quiz_scores_cluster_allowed check (cluster in ('devnet', 'mainnet-beta'))
);

create index if not exists motion_quiz_scores_leaderboard_idx
  on public.motion_quiz_scores (cluster, pack_id, pack_content_hash, accuracy desc, score desc, duration_ms asc nulls last);

create index if not exists motion_quiz_scores_wallet_idx
  on public.motion_quiz_scores (wallet_address);

alter table public.motion_quiz_scores enable row level security;

-- Public leaderboard read
create policy motion_quiz_scores_public_select
  on public.motion_quiz_scores
  for select
  to anon, authenticated
  using (true);

-- Best score per wallet per topic version (pack content hash)
create or replace view public.motion_quiz_topic_leaderboard as
select distinct on (cluster, pack_id, pack_content_hash, wallet_address)
  id,
  wallet_address,
  wallet_short,
  cluster,
  pack_id,
  pack_title,
  pack_content_hash,
  score,
  total,
  accuracy,
  duration_ms,
  session_id,
  result_hash,
  tx_signature,
  slot,
  block_time,
  created_at
from public.motion_quiz_scores
order by
  cluster,
  pack_id,
  pack_content_hash,
  wallet_address,
  accuracy desc,
  score desc,
  duration_ms asc nulls last,
  block_time asc nulls last,
  created_at asc;

comment on table public.motion_quiz_scores is
  'Verified Motion Quiz scores anchored by Solana Memo Program transactions.';

comment on view public.motion_quiz_topic_leaderboard is
  'Best verified score per wallet per built-in topic version (cluster + pack_id + pack_content_hash).';

grant select on public.motion_quiz_topic_leaderboard to anon, authenticated;
grant select on public.motion_quiz_scores to anon, authenticated;
