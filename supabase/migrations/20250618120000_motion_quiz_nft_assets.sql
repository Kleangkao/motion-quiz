-- Photo Moment NFT asset storage (public read, narrow anon upload for demo/devnet paths).
-- Apply manually in Supabase if not using automated migration deploy.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'motion-quiz-nft-assets',
  'motion-quiz-nft-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'application/json']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists motion_quiz_nft_assets_public_read on storage.objects;
create policy motion_quiz_nft_assets_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'motion-quiz-nft-assets');

drop policy if exists motion_quiz_nft_assets_cluster_upload on storage.objects;
create policy motion_quiz_nft_assets_cluster_upload
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'motion-quiz-nft-assets'
    and (storage.foldername(name))[1] in ('devnet', 'mainnet-beta')
  );

drop policy if exists motion_quiz_nft_assets_cluster_update on storage.objects;
create policy motion_quiz_nft_assets_cluster_update
  on storage.objects
  for update
  to anon, authenticated
  using (
    bucket_id = 'motion-quiz-nft-assets'
    and (storage.foldername(name))[1] in ('devnet', 'mainnet-beta')
  )
  with check (
    bucket_id = 'motion-quiz-nft-assets'
    and (storage.foldername(name))[1] in ('devnet', 'mainnet-beta')
  );

comment on policy motion_quiz_nft_assets_cluster_upload on storage.objects is
  'Demo MVP: allows browser uploads to cluster-prefixed NFT asset paths. Tighten for mainnet production (Edge Function upload recommended).';
