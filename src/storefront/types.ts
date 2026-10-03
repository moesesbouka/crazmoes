export interface StorefrontListing {
  id: number | string;
  facebook_id: string;
  title: string;
  description: string | null;
  price: number | null;
  condition: string | null;
  images: unknown;
  category: string | null;
  listing_url: string | null;
  location: string | null;
  imported_at: string | null;
  updated_at: string | null;
  status: string | null;
}

export type CatalogSort = "newest" | "price-asc" | "price-desc" | "title-asc";

export interface CatalogFilters {
  page?: number;
  pageSize?: number;
  query?: string;
  department?: string;
  subcategory?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
}

export interface CatalogPage {
  items: StorefrontListing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StorefrontSubcategory {
  name: string;
  slug: string;
  keywords: string[];
}

export interface StorefrontDepartment {
  name: string;
  slug: string;
  description: string;
  keywords: string[];
  subcategories: StorefrontSubcategory[];
}
