
-- Drop all existing restrictive policies on marketplace_listings
DROP POLICY IF EXISTS "Anyone can view marketplace listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Admins can manage marketplace listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Anyone can insert marketplace listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Anyone can update marketplace listings via upsert" ON public.marketplace_listings;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can view marketplace listings"
  ON public.marketplace_listings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert marketplace listings"
  ON public.marketplace_listings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update marketplace listings via upsert"
  ON public.marketplace_listings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage marketplace listings"
  ON public.marketplace_listings FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid()));
