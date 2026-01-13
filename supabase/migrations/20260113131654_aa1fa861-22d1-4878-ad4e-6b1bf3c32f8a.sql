-- Add columns for Shopify integration tracking
ALTER TABLE public.marketplace_listings 
ADD COLUMN IF NOT EXISTS shopify_product_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS launched_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for faster queries on launched products
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_shopify_product_id 
ON public.marketplace_listings(shopify_product_id) 
WHERE shopify_product_id IS NOT NULL;

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status 
ON public.marketplace_listings(status);

-- Add index for sorting by price
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_price 
ON public.marketplace_listings(price);

-- Comment on new columns
COMMENT ON COLUMN public.marketplace_listings.shopify_product_id IS 'Shopify product ID when launched to website';
COMMENT ON COLUMN public.marketplace_listings.launched_at IS 'Timestamp when product was launched to Shopify';