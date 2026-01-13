-- Step 1: Clear all existing data (one-time cleanup)
TRUNCATE TABLE public.marketplace_listings;

-- Step 2: Add account_tag column with default 'MBFB'
ALTER TABLE public.marketplace_listings
ADD COLUMN IF NOT EXISTS account_tag TEXT NOT NULL DEFAULT 'MBFB';

-- Step 3: Add shopify_handle and launch_status columns for future use
ALTER TABLE public.marketplace_listings
ADD COLUMN IF NOT EXISTS shopify_handle TEXT DEFAULT NULL;

ALTER TABLE public.marketplace_listings
ADD COLUMN IF NOT EXISTS launch_status TEXT DEFAULT NULL;

-- Step 4: Enforce facebook_id NOT NULL going forward
ALTER TABLE public.marketplace_listings
ALTER COLUMN facebook_id SET NOT NULL;

-- Step 5: Create unique index for proper upsert (order matches REST on_conflict parameter)
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_listings_account_facebook_uidx
ON public.marketplace_listings (account_tag, facebook_id);