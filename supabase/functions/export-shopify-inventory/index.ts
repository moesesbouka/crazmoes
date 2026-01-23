import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_DOMAIN = "rsg4h0-q3.myshopify.com";
const API_VERSION = "2024-01";

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  handle: string;
  status: string;
  tags: string;
  images: Array<{
    id: number;
    src: string;
    alt: string | null;
    position: number;
    width: number;
    height: number;
  }>;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    compare_at_price: string | null;
    sku: string;
    inventory_quantity: number;
    weight: number;
    weight_unit: string;
  }>;
  options: Array<{
    id: number;
    name: string;
    values: string[];
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    if (!shopifyToken) {
      console.error("Missing SHOPIFY_ACCESS_TOKEN");
      return new Response(
        JSON.stringify({ error: "Shopify not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting Shopify inventory export...");
    
    const allProducts: ShopifyProduct[] = [];
    let pageInfo: string | null = null;
    let hasNextPage = true;
    let pageCount = 0;
    
    // Fetch all products with pagination
    while (hasNextPage) {
      pageCount++;
      let url = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/products.json?limit=250`;
      
      if (pageInfo) {
        url += `&page_info=${pageInfo}`;
      }
      
      console.log(`Fetching page ${pageCount}...`);
      
      const response = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": shopifyToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Shopify API error: ${response.status}`, errorText);
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      allProducts.push(...data.products);
      
      // Check for pagination via Link header
      const linkHeader = response.headers.get("Link");
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
        if (nextMatch) {
          pageInfo = nextMatch[1];
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
    }

    console.log(`Export complete: ${allProducts.length} products fetched across ${pageCount} pages`);

    // Build comprehensive export data
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        shopDomain: SHOPIFY_DOMAIN,
        totalProducts: allProducts.length,
        totalImages: allProducts.reduce((sum, p) => sum + p.images.length, 0),
        totalVariants: allProducts.reduce((sum, p) => sum + p.variants.length, 0),
      },
      products: allProducts.map(product => ({
        // Core info
        id: product.id,
        handle: product.handle,
        title: product.title,
        description: product.body_html,
        descriptionPlainText: product.body_html?.replace(/<[^>]*>/g, '').trim() || '',
        
        // Categorization
        vendor: product.vendor,
        productType: product.product_type,
        tags: product.tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
        status: product.status,
        
        // Timestamps
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        publishedAt: product.published_at,
        
        // Pricing (from first variant)
        price: product.variants[0]?.price || '0.00',
        compareAtPrice: product.variants[0]?.compare_at_price || null,
        
        // All images with full details
        images: product.images.map(img => ({
          id: img.id,
          url: img.src,
          alt: img.alt,
          position: img.position,
          width: img.width,
          height: img.height,
        })),
        
        // All variants
        variants: product.variants.map(v => ({
          id: v.id,
          title: v.title,
          price: v.price,
          compareAtPrice: v.compare_at_price,
          sku: v.sku,
          inventoryQuantity: v.inventory_quantity,
          weight: v.weight,
          weightUnit: v.weight_unit,
        })),
        
        // Product options
        options: product.options.map(opt => ({
          id: opt.id,
          name: opt.name,
          values: opt.values,
        })),
        
        // Direct links
        shopifyAdminUrl: `https://${SHOPIFY_DOMAIN}/admin/products/${product.id}`,
        storefrontUrl: product.published_at ? `https://${SHOPIFY_DOMAIN}/products/${product.handle}` : null,
      })),
    };

    return new Response(
      JSON.stringify(exportData, null, 2),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="shopify-inventory-${new Date().toISOString().split('T')[0]}.json"`,
        } 
      }
    );
  } catch (error: any) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Export failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
