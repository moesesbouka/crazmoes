-- Drop the restrictive insert policy and create a permissive one that allows upserts
DROP POLICY IF EXISTS "Anyone can insert marketplace listings" ON public.marketplace_listings;

-- Create a policy that allows both INSERT and UPDATE for anonymous upserts
CREATE POLICY "Anyone can insert marketplace listings" 
ON public.marketplace_listings 
FOR INSERT 
WITH CHECK (true);

-- Add UPDATE policy for anonymous upserts (needed for ON CONFLICT updates)
CREATE POLICY "Anyone can update marketplace listings via upsert" 
ON public.marketplace_listings 
FOR UPDATE 
USING (true)
WITH CHECK (true);