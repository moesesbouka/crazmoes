-- Add debugging columns for v1.2.7
ALTER TABLE public.marketplace_listings 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'graphql';

ALTER TABLE public.marketplace_listings 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();