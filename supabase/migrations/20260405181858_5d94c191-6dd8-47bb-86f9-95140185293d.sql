
-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read product images
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow authenticated users (admins) to upload
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Create a table to track which images have been stored
CREATE TABLE public.stored_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facebook_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  stored_url TEXT NOT NULL,
  image_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(facebook_id, image_index)
);

-- Allow public read on stored images
ALTER TABLE public.stored_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stored images"
ON public.stored_images FOR SELECT
TO public
USING (true);

CREATE POLICY "Service role can insert stored images"
ON public.stored_images FOR INSERT
TO authenticated
WITH CHECK (true);
