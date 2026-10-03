import { marketplaceDb } from "@/lib/marketplace-client";
import { keywordsForRoute } from "./taxonomy";
import type { CatalogFilters, CatalogPage, StorefrontListing } from "./types";

const SELECT_FIELDS = "id,facebook_id,title,description,price,condition,images,category,listing_url,location,imported_at,updated_at,status";

function clampPageSize(value?: number) {
  if (!Number.isFinite(value)) return 36;
  return Math.min(72, Math.max(12, Math.floor(value as number)));
}

function cleanSearchTerm(value: string) {
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
}

function keywordOrFilter(keywords: string[]) {
  return keywords
    .map(cleanSearchTerm)
    .filter(Boolean)
    .flatMap((keyword) => [
      `title.ilike.%${keyword}%`,
      `description.ilike.%${keyword}%`,
      `category.ilike.%${keyword}%`,
    ])
    .join(",");
}

export async function fetchCatalogPage(filters: CatalogFilters = {}): Promise<CatalogPage> {
  const pageSize = clampPageSize(filters.pageSize);
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = marketplaceDb
    .from("public_listings")
    .select(SELECT_FIELDS, { count: "exact" });

  const q = cleanSearchTerm(filters.query ?? "");
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const taxonomyKeywords = keywordsForRoute(filters.department, filters.subcategory);
  if (taxonomyKeywords.length > 0) {
    query = query.or(keywordOrFilter(taxonomyKeywords));
  }

  if (filters.condition) {
    query = query.eq("condition", filters.condition);
  }

  if (Number.isFinite(filters.minPrice)) {
    query = query.gte("price", Number(filters.minPrice));
  }

  if (Number.isFinite(filters.maxPrice)) {
    query = query.lte("price", Number(filters.maxPrice));
  }

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true, nullsFirst: false });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false, nullsFirst: false });
      break;
    case "title-asc":
      query = query.order("title", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("imported_at", { ascending: false, nullsFirst: false });
      break;
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  const items = (data ?? []) as StorefrontListing[];
  const total = count ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages,
  };
}

export function cleanImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter((value): value is string => typeof value === "string" && /^https:\/\//i.test(value));
}

export function formatCatalogPrice(price: number | null) {
  if (!price || price <= 0) return "Make Offer";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}
