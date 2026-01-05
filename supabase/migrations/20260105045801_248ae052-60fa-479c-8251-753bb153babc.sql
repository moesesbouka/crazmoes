-- Create table for storing imported Facebook Marketplace listings
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facebook_id TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  images TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  category TEXT,
  condition TEXT,
  location TEXT,
  listing_url TEXT,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable Row Level Security
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin-only access
CREATE POLICY "Admins can manage marketplace listings"
ON public.marketplace_listings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM admin_profiles
  WHERE admin_profiles.user_id = auth.uid()
));

-- Create policy for public read access (for extensions to verify imports)
CREATE POLICY "Anyone can view marketplace listings"
ON public.marketplace_listings
FOR SELECT
USING (true);

-- Create policy for anyone to insert (extensions need this)
CREATE POLICY "Anyone can insert marketplace listings"
ON public.marketplace_listings
FOR INSERT
WITH CHECK (true);

-- Create index for faster searches
CREATE INDEX idx_marketplace_listings_title ON public.marketplace_listings USING GIN (to_tsvector('english', title));
CREATE INDEX idx_marketplace_listings_status ON public.marketplace_listings (status);
CREATE INDEX idx_marketplace_listings_imported_at ON public.marketplace_listings (imported_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_marketplace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_marketplace_listings_updated_at
BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_marketplace_updated_at();

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_listings;

-- Create storage bucket for marketplace images
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace-images', 'marketplace-images', true);

-- Create storage policies
CREATE POLICY "Marketplace images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'marketplace-images');

CREATE POLICY "Anyone can upload marketplace images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'marketplace-images');

CREATE POLICY "Admins can manage marketplace images"
ON storage.objects
FOR ALL
USING (bucket_id = 'marketplace-images' AND EXISTS (
  SELECT 1 FROM admin_profiles
  WHERE admin_profiles.user_id = auth.uid()
));