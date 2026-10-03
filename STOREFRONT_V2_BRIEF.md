# Crazy Moe's Storefront V2

## Goal
Rebuild the public storefront into a premium, high-end retail experience while preserving the existing Supabase-backed inventory and pickup-first business model.

The target should feel like a professionally commissioned ecommerce site, not a liquidation template: strong typography, large product imagery, refined motion, fast search, clear merchandising, excellent mobile UX, and a proper category system.

## Non-negotiables
- Work only on branch `codex/storefront-v2` until approved.
- Do not deploy to production without explicit operator approval.
- Do not change production credentials or expose secrets.
- Keep Muse metadata-only; Muse must never own or modify images.
- Preserve current Supabase inventory as the shared source for Crazy Moe's / Buffalo Deal Depot.
- Do not touch deli.buffalodealdepot.com.
- Do not break admin, importer, pickup scheduling, or existing product URLs.
- Prefer progressive enhancement over a rewrite that discards working integrations.

## Brand direction
Premium dark retail aesthetic with a warm Crazy Moe accent, editorial typography, crisp product photography, restrained motion, and minimal clutter.

Avoid:
- cheap clearance-store styling
- neon overload
- dense dashboard-like layouts
- generic Shopify-template feel

Core message:
**Big-brand inventory. Serious discounts. Local Buffalo pickup. Inventory changes constantly.**

## Homepage merchandising
Homepage should be inventory-driven rather than mostly static.

Recommended sections:
1. Cinematic hero using a strong current deal
2. New this week
3. Just dropped
4. Best deals under $100
5. Big-ticket steals
6. Only one left / low-stock style urgency where justified
7. Featured departments
8. Recently added inventory
9. Popular brands
10. Seasonal / timely deals
11. Pickup + trust section
12. Reviews / social proof
13. Newsletter / alert signup

Use skeleton loading, responsive image sizing, and motion sparingly.

## Category architecture
Create a controlled storefront taxonomy independent from raw Facebook category names.

Top-level departments:
- Electronics
- Appliances
- Furniture
- Home Improvement
- Tools & Equipment
- Outdoor & Seasonal
- Fitness
- Scooters & E-Bikes
- Gaming & Arcade
- Smart Home & Security
- Automotive
- Kids & Toys
- Clearance
- New Arrivals

Example subcategories:

Electronics:
- TVs
- Monitors
- Computers
- Audio
- Networking
- Projectors
- Cameras

Appliances:
- Air Conditioners
- Dehumidifiers
- Fans
- Microwaves
- Vacuums
- Kitchen Appliances

Furniture:
- Living Room
- Bedroom
- Office
- Mattresses
- Desks
- Chairs

Home Improvement:
- Bathroom
- Plumbing
- Cabinets
- Fixtures
- Doors
- Hardware

## Catalog / search
Replace the current all-client-side catalog load with query-driven browsing suitable for 2,000+ products and future growth.

Required capabilities:
- server/database-side pagination
- instant search
- category + subcategory filters
- brand filter
- price range
- condition
- availability
- newest
- price low/high
- biggest discount when reference MSRP/retail exists
- mobile filter drawer
- desktop filter sidebar
- breadcrumb navigation
- stable shareable URLs

Preferred route shapes:
- `/shop`
- `/electronics`
- `/electronics/tvs`
- `/home-improvement/bathroom`
- `/gaming/arcade`

Keep backward compatibility with existing query-string links where practical.

## Product cards
Cards should feel premium and retail-first.

Include:
- image
- title
- price
- condition when useful
- category / brand label
- pickup indicator
- subtle hover interaction
- clear no-image fallback

Do not overfill cards with metadata.

## Product detail
Product pages should become a flagship part of the experience.

Required:
- full multi-image gallery
- thumbnails
- fullscreen / zoom
- price
- condition
- availability
- brand / category
- clean description
- structured specs where possible
- pickup information
- Reserve / Schedule Pickup CTA
- Ask About This Item CTA
- share action
- related products
- recently viewed
- policy / trust information
- mobile sticky action bar

Example mobile sticky action:
`$149 · Reserve for Pickup`

The page must gracefully handle one-image products while taking full advantage of the gallery backfill once multiple images are available.

## Pickup-first commerce
Do not prioritize conventional cart/checkout yet.

Primary conversion flow:
1. Discover product
2. View details/gallery
3. Reserve / inquire
4. Schedule pickup

Prevent UI that implies guaranteed ecommerce inventory reservation unless the backend actually guarantees it.

## Personalization / convenience
Add where practical:
- favorites / wishlist
- recently viewed
- related products
- category alerts / notify me
- shareable links

Use local persistence initially if authenticated persistence is not already available.

## Performance
- Do not fetch the entire catalog just to render the first page.
- Use paginated Supabase queries.
- Lazy-load below-the-fold imagery.
- Prefer properly sized images.
- Avoid layout shift.
- Minimize animation cost on mobile.
- Maintain excellent Core Web Vitals where feasible.

## SEO
Add:
- product structured data
- canonical product URLs
- category metadata
- Open Graph metadata
- sensible titles/descriptions
- crawlable category pages

Do not create thousands of low-quality indexable filter combinations.

## Accessibility
Maintain:
- keyboard navigation
- visible focus states
- correct labels
- adequate contrast
- alt text
- semantic headings
- touch-friendly controls

## Architecture approach
Preserve the current Vite + React + Tailwind/Shadcn stack unless a compelling migration reason is documented.

Suggested modules:
- `src/storefront/taxonomy.ts`
- `src/storefront/types.ts`
- `src/storefront/catalog.ts`
- `src/storefront/merchandising.ts`
- reusable product card/gallery/filter components

Separate public storefront concerns from admin/importer logic.

## Taxonomy normalization
Do not rely on Facebook categories as the final customer-facing taxonomy.

Implement a mapping layer that can classify current category/title data into controlled departments and subcategories. Keep the original source category available for audit/debugging.

Do not mass-write reclassification to production as part of the design branch. Start with a read-time mapping or a migration proposal.

## Data safety
- Never delete listings because the storefront cannot classify them.
- Uncategorized items should fall back to an `Other` / `More Deals` bucket rather than disappearing.
- Only show listings allowed by the current public availability rules.
- Preserve existing product IDs and gallery URLs.

## Current known weakness to replace
The existing Shop page loads all rows in chunks and then filters/sorts in the browser. Replace this with scalable database-backed queries and pagination.

## Design system
Create a coherent system for:
- spacing
- typography
- radii
- shadows
- backgrounds
- surfaces
- accent usage
- cards
- chips
- form controls
- empty states
- loading states

Avoid one-off visual treatments on every section.

## Implementation phases

### Phase 1 — Foundation
- storefront design tokens
- taxonomy mapping
- reusable product card
- reusable media/gallery utilities
- scalable catalog query layer
- route structure

### Phase 2 — Shop
- desktop + mobile filters
- database pagination
- sorting
- search
- category/subcategory navigation
- polished product grid

### Phase 3 — Product detail
- gallery
- sticky purchase/reserve actions
- related products
- recently viewed
- structured information

### Phase 4 — Homepage
- premium hero
- merchandising rails
- category merchandising
- trust/pickup content
- newsletter / alerts

### Phase 5 — Polish
- accessibility audit
- mobile refinement
- animation refinement
- SEO metadata
- performance audit
- Vercel preview deployment

## Acceptance criteria
- Design feels comparable to polished modern retail websites.
- Mobile feels first-class, not a compressed desktop layout.
- 2,000+ product catalog remains responsive.
- Search/filtering does not require downloading the entire inventory.
- Product galleries support multiple permanent Supabase images.
- Category structure is significantly richer than the current four-card homepage.
- Existing pickup functionality remains reachable.
- Existing public product links remain compatible or redirect cleanly.
- No production changes until preview approval.

## Handoff / preview
When the branch reaches a usable state:
- run lint/build
- document any warnings
- deploy only to a Vercel preview
- provide the preview URL
- do not promote to production without approval
