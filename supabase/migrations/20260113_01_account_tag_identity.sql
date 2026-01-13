begin;

-- 1) add account_tag (multi-account support)
alter table public.listings
add column if not exists account_tag text not null default 'MBFB';

update public.listings
set account_tag = 'MBFB'
where account_tag is null;

-- 2) Make sure duplicates can't happen per account
-- IMPORTANT: We do this safely first WITHOUT forcing facebook_id NOT NULL yet.
-- This unique index enforces uniqueness where facebook_id exists,
-- and won't break old rows that still have NULL facebook_id.
create unique index if not exists listings_account_facebook_uidx
on public.listings (account_tag, facebook_id)
where facebook_id is not null;

commit;
