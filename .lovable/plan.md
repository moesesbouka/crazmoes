

## Fix: Remove Shopify entirely, fix Shop.tsx status casing

### The one-line bug
`src/pages/Shop.tsx` line 104: `.eq("status", "Active")` should be `.eq("status", "active")`. The `is_active` filter on line 105 is correct and stays.

### Full plan (13 file edits, 4 file deletions)

**1. Fix Shop.tsx** — Change `"Active"` → `"active"` on line 104. Nothing else changes.

**2. Add `formatPrice` and `ShopifyProduct` type to `src/lib/supabase-listings.ts`** — Copy the `ShopifyProduct` interface and `formatPrice` function from `shopify.ts` into this file so all 9 importing files can switch their import source. The `listingToShopifyShape` adapter already produces this exact shape, so no downstream component changes needed beyond the import path.

**3. Swap imports in 6 component/page files** — Change `from "@/lib/shopify"` to `from "@/lib/supabase-listings"` in:
- `src/components/ProductCard.tsx` (line 1)
- `src/components/ProductGrid.tsx` (line 1)
- `src/components/FeaturedProducts.tsx` (line 1)
- `src/components/CategorySection.tsx` (line 1)
- `src/pages/Index.tsx` (line 12)
- `src/pages/ProductDetail.tsx` (line 11)

**4. Rewrite `src/pages/SchedulePickup.tsx`** — Replace `fetchAllProducts()` (line 15, 35) with `fetchActiveListings()` from supabase-listings, then map results through `listingToShopifyShape()` for the product dropdown.

**5. Rewrite `src/components/admin/AdminCategoryManager.tsx`** — Replace `fetchAllProducts()` (line 10, 35) with a direct Supabase query fetching all listings (no status filter for admin). Map through `listingToShopifyShape()`.

**6. Clean up `src/pages/Admin.tsx`** — Remove the Shopify tab: delete the `AdminShopifyInventory` import (line 12), the `Store` icon import (line 7), the tab trigger (lines 107-110), and tab content (lines 137-139). Remove the `ShoppingBag` icon if unused.

**7. Clean up `src/components/admin/AdminTools.tsx`** — Remove the Shopify export card (lines 275-335), the `exportShopifyInventoryJson` and `exportShopifyInventoryCsv` functions (~lines 183-270), and related state variables. Keep the Chrome extension download cards.

**8. Delete 4 files:**
- `src/lib/shopify.ts`
- `src/components/admin/AdminShopifyInventory.tsx`
- `supabase/functions/export-shopify-inventory/index.ts`
- `supabase/functions/launch-to-shopify/index.ts`

### No database changes needed
Schema is correct. Status values are lowercase `'active'`. The `is_active` column exists and should remain in queries.

### RLS note
All SELECT policies are currently `RESTRICTIVE` with `USING (true)`. This works because there's only one SELECT policy — a single restrictive policy with `true` passes fine. No RLS changes needed.

