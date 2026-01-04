import { toast } from "sonner";

const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'rsg4h0-q3.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = 'b625a5fefb4f8c11ee9452d7d8d5b212';

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

const STOREFRONT_QUERY_WITH_CATEGORY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          description
          handle
          productType
          category {
            name
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
        }
      }
    }
  }
`;

// Fallback query (Shopify occasionally returns INTERNAL_SERVER_ERROR when requesting category at scale)
const STOREFRONT_QUERY_NO_CATEGORY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          description
          handle
          productType
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
        }
      }
    }
  }
`;

export async function storefrontApiRequest(query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Payment required", {
      description: "Your store needs to be upgraded to a paid plan. Visit https://admin.shopify.com to upgrade.",
    });
    return null;
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`Error calling Shopify: ${data.errors.map((e: { message: string }) => e.message).join(', ')}`);
  }

  return data;
}

export async function fetchProducts(limit: number = 250): Promise<ShopifyProduct[]> {
  // Smaller pages are more reliable (Shopify may return INTERNAL_SERVER_ERROR when the payload is too large)
  const PAGE_SIZE = 20;

  const allProducts: ShopifyProduct[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const remaining = limit === Infinity ? PAGE_SIZE : Math.max(0, limit - allProducts.length);
    const firstBase = limit === Infinity ? PAGE_SIZE : Math.min(PAGE_SIZE, remaining);
    if (firstBase <= 0) break;

    const trySizes = [firstBase, Math.max(5, Math.floor(firstBase / 2))];

    let data: any;

    // Try WITH_CATEGORY first (best categorization)
    for (const size of trySizes) {
      try {
        data = await storefrontApiRequest(STOREFRONT_QUERY_WITH_CATEGORY, {
          first: size,
          after: cursor,
        });
        break;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isInternal = message.includes("Internal error") || message.includes("INTERNAL_SERVER_ERROR");
        if (!isInternal) {
          // Non-internal errors shouldn't block showing inventory; return what we have so far.
          return allProducts;
        }
      }
    }

    // If WITH_CATEGORY fails, fall back to NO_CATEGORY for this page
    if (!data) {
      for (const size of trySizes) {
        try {
          data = await storefrontApiRequest(STOREFRONT_QUERY_NO_CATEGORY, {
            first: size,
            after: cursor,
          });
          break;
        } catch {
          // keep trying smaller
        }
      }
    }

    if (!data) {
      // Give up gracefully; show the inventory we managed to load.
      return allProducts;
    }

    const { edges, pageInfo } = data.data.products;

    if (!edges?.length) break;

    allProducts.push(...edges);

    hasNextPage = Boolean(pageInfo?.hasNextPage);
    cursor = pageInfo?.endCursor ?? null;

    // Safety: prevent infinite loops if Shopify returns hasNextPage without a cursor
    if (hasNextPage && !cursor) break;

    if (limit !== Infinity && allProducts.length >= limit) {
      return allProducts.slice(0, limit);
    }
  }

  return allProducts;
}

export async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  return fetchProducts(Infinity);
}

export function formatPrice(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(parseFloat(amount));
}
