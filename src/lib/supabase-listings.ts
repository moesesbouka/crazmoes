import { marketplaceDb } from "@/lib/marketplace-client";

export interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    productType: string;
    category?: {
      name: string;
    } | null;
    _listingUrl?: string;
    _condition?: string;
    _importedAt?: string;
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    images: {
      edges: Array<{
        node: {
          url: string;
          altText: string | null;
        };
      }>;
    };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: {
            amount: string;
            currencyCode: string;
          };
          availableForSale: boolean;
          selectedOptions: Array<{
            name: string;
            value: string;
          }>;
        };
      }>;
    };
    options: Array<{
      name: string;
      values: string[];
    }>;
  };
}

export function formatPrice(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(parseFloat(amount));
}

export interface MarketplaceListing {
  id: string;
  facebook_id: string;
  title: string;
  price: number | null;
  description: string | null;
  category: string | null;
  condition: string | null;
  images: string[] | null;
  listing_url: string | null;
  status: string;
  imported_at: string;
  last_seen_at: string | null;
}

export async function fetchActiveListings(limit = 1000): Promise<MarketplaceListing[]> {
  const all: MarketplaceListing[] = [];
  let offset = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await marketplaceDb
      .from("public_listings")
      .select("*")
      .order("imported_at", { ascending: false })
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error("[fetchActiveListings] error:", error.message);
      break;
    }
    if (!data?.length) break;

    all.push(...(data as MarketplaceListing[]));
    if (data.length < PAGE || all.length >= limit) break;
    offset += PAGE;
  }

  return all.slice(0, limit);
}

export async function fetchActiveListingsProgressive(
  onBatch: (listings: MarketplaceListing[], isComplete: boolean) => void,
  limit = Infinity
): Promise<void> {
  const PAGE = 500;
  const all: MarketplaceListing[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await marketplaceDb
      .from("public_listings")
      .select("*")
      .order("imported_at", { ascending: false })
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error("[fetchActiveListingsProgressive] error:", error.message);
      onBatch(all, true);
      return;
    }
    if (!data?.length) {
      onBatch(all, true);
      return;
    }

    all.push(...(data as MarketplaceListing[]));
    const isComplete = data.length < PAGE || all.length >= limit;
    onBatch([...all], isComplete);
    if (isComplete) return;
    offset += PAGE;
  }
}

export async function fetchListingByFacebookId(facebookId: string): Promise<MarketplaceListing | null> {
  const { data, error } = await marketplaceDb
    .from("public_listings")
    .select("*")
    .eq("facebook_id", facebookId)
    .single();

  if (error || !data) return null;
  return data as MarketplaceListing;
}

/** Convert a MarketplaceListing to match the ShopifyProduct shape so existing
 *  ProductCard / ProductGrid components work with zero changes. */
export function listingToShopifyShape(l: MarketplaceListing) {
  const images = (l.images ?? []).filter(Boolean);
  return {
    node: {
      id: l.facebook_id,
      title: l.title,
      description: l.description ?? "",
      handle: l.facebook_id,
      productType: l.category ?? "",
      category: l.category ? { name: l.category } : null,
      _listingUrl: l.listing_url,
      _condition: l.condition,
      _importedAt: l.imported_at,
      priceRange: {
        minVariantPrice: {
          amount: l.price != null ? String(l.price) : "0",
          currencyCode: "USD",
        },
      },
      images: {
        edges: images.length
          ? images.map((url) => ({ node: { url, altText: l.title } }))
          : [{ node: { url: "/placeholder.svg", altText: l.title } }],
      },
      variants: {
        edges: [
          {
            node: {
              id: l.facebook_id,
              title: "Default",
              price: { amount: l.price != null ? String(l.price) : "0", currencyCode: "USD" },
              availableForSale: true,
              selectedOptions: [],
            },
          },
        ],
      },
      options: [],
    },
  };
}
