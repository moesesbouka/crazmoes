import { marketplaceDb } from "@/lib/marketplace-client";

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

export async function fetchListingByFacebookId(facebookId: string): Promise<MarketplaceListing | null> {
  const { data, error } = await marketplaceDb
    .from("public_active_listings")
    .select("*")
    .eq("facebook_id", facebookId)
    .single();

  if (error || !data) return null;
  return data as MarketplaceListing;
}
